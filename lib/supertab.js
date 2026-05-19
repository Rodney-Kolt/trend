/**
 * Supertab Merchant API integration.
 *
 * Auth:     OAuth2 Client Credentials
 * Token URL: https://merchant-auth.supertab.co/oauth2/token
 * Base URL:  https://tapi.supertab.co/mapi/
 * API ver:   2025-04-01
 *
 * Flow:
 *  1. Exchange Client ID + Secret for a Bearer token
 *  2. POST /onetime_offerings to create a one-time offering
 *  3. Return the offering ID + a purchase URL for the customer
 *
 * Webhooks delivered via Svix with headers:
 *   svix-id, svix-timestamp, svix-signature
 */

const MAPI_BASE      = 'https://tapi.supertab.co/mapi';
const TOKEN_URL      = 'https://merchant-auth.supertab.co/oauth2/token';
const API_VERSION    = '2025-04-01';

// In-memory token cache (resets on cold start — fine for serverless)
let _tokenCache = { token: null, expiresAt: 0 };

/**
 * Obtain a Merchant API Bearer token via OAuth2 Client Credentials.
 * Caches the token until 60 seconds before expiry.
 */
async function getMerchantToken() {
  const clientId     = process.env.SUPERTAB_CLIENT_ID;
  const clientSecret = process.env.SUPERTAB_API_KEY; // the secret you provided

  if (!clientId)     throw new Error('SUPERTAB_CLIENT_ID is not set');
  if (!clientSecret) throw new Error('SUPERTAB_API_KEY (client secret) is not set');

  // Return cached token if still valid
  if (_tokenCache.token && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token;
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials&scope=mapi%3Aread%20mapi%3Awrite',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supertab token error ${res.status}: ${err}`);
  }

  const data = await res.json();
  _tokenCache = {
    token:     data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return _tokenCache.token;
}

/**
 * Create a Supertab one-time offering for the Pro plan.
 *
 * Returns the offering ID and a checkout URL that the customer
 * can use to complete the purchase via the Supertab Customer API.
 *
 * @param {string} userEmail  - Customer email
 * @param {string} userId     - Supabase user ID (stored in metadata for webhook)
 * @returns {Promise<{ checkoutUrl: string, sessionId: string }>}
 */
export async function createSupertabCheckout(userEmail, userId) {
  const clientId = process.env.SUPERTAB_CLIENT_ID;
  if (!clientId) throw new Error('SUPERTAB_CLIENT_ID is not set');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const token  = await getMerchantToken();

  const res = await fetch(`${MAPI_BASE}/onetime_offerings`, {
    method: 'POST',
    headers: {
      'Content-Type':          'application/json',
      'Authorization':         `Bearer ${token}`,
      'x-supertab-client-id':  clientId,
      'x-api-version':         API_VERSION,
    },
    body: JSON.stringify({
      currency_code: 'USD',
      // Embed supabase_user_id so the webhook can upgrade the right user
      metadata: {
        supabase_user_id: userId,
        user_email:       userEmail,
      },
      items: [
        {
          description: 'Trendspotter Pro — Monthly',
          price: {
            amount:        1900, // $19.00 in cents
            currency_code: 'USD',
          },
          metadata: {
            supabase_user_id: userId,
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Supertab offering error ${res.status}: ${err?.message || err?.detail || JSON.stringify(err)}`
    );
  }

  const offering = await res.json();
  const offeringId = offering.id;

  // Build the customer-facing checkout URL
  // Supertab's checkout app URL for purchasing a one-time offering
  const checkoutUrl =
    `https://checkout.supertab.co/onetime/${offeringId}` +
    `?success_url=${encodeURIComponent(`${appUrl}/dashboard?upgrade=success`)}` +
    `&cancel_url=${encodeURIComponent(`${appUrl}/pricing?upgrade=cancelled`)}` +
    `&client_id=${encodeURIComponent(clientId)}`;

  return { checkoutUrl, sessionId: offeringId };
}

/**
 * Verify a Supertab / Svix webhook signature.
 *
 * Svix signs with: "{svix-id}.{svix-timestamp}.{rawBody}"
 * Signature header: "v1,<base64-hmac-sha256>" (space-separated if multiple)
 *
 * @param {string}  rawBody  - Raw request body string
 * @param {Headers} headers  - Request headers
 * @returns {Promise<boolean>}
 */
export async function verifySupertabWebhook(rawBody, headers) {
  const secret = process.env.SUPERTAB_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('SUPERTAB_WEBHOOK_SECRET not set — skipping verification (dev mode)');
    return true;
  }

  try {
    const msgId        = headers.get('svix-id')        || '';
    const msgTimestamp = headers.get('svix-timestamp') || '';
    const msgSignature = headers.get('svix-signature') || '';

    if (!msgId || !msgTimestamp || !msgSignature) {
      console.warn('Supertab webhook: missing Svix headers');
      return false;
    }

    // Reject messages older than 5 minutes
    const ts = parseInt(msgTimestamp, 10);
    if (Math.abs(Date.now() / 1000 - ts) > 300) {
      console.warn('Supertab webhook: timestamp too old');
      return false;
    }

    // Secret format: "whsec_<base64>" or raw base64
    const secretBase64 = secret.startsWith('whsec_') ? secret.slice(6) : secret;
    const secretBytes  = base64ToUint8Array(secretBase64);

    const key = await crypto.subtle.importKey(
      'raw', secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign']
    );

    const toSign    = `${msgId}.${msgTimestamp}.${rawBody}`;
    const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(toSign));
    const computed  = uint8ArrayToBase64(new Uint8Array(sigBuffer));

    // May have multiple sigs: "v1,sig1 v1,sig2"
    for (const sig of msgSignature.split(' ')) {
      const [ver, val] = sig.split(',');
      if (ver === 'v1' && val === computed) return true;
    }

    return false;
  } catch (err) {
    console.error('Supertab webhook verification error:', err);
    return false;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function base64ToUint8Array(b64) {
  const binary = atob(b64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
