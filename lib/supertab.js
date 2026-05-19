/**
 * Supertab Payments integration helper.
 * API docs: https://docs.supertab.co
 *
 * Supertab holds funds until KYC is complete — works with MoMo virtual card.
 * No monthly fee; commission-only model.
 */

const SUPERTAB_API_BASE = 'https://api.supertab.co/v1';

/**
 * Create a Supertab checkout session for the Pro plan ($19/month).
 * @param {string} userEmail  - Customer email address
 * @param {string} userId     - Supabase user ID (stored in metadata for webhook)
 * @returns {Promise<{ checkoutUrl: string, sessionId: string }>}
 */
export async function createSupertabCheckout(userEmail, userId) {
  const apiKey = process.env.SUPERTAB_API_KEY;
  if (!apiKey) throw new Error('SUPERTAB_API_KEY is not set');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const res = await fetch(`${SUPERTAB_API_BASE}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      amount: 1900,          // $19.00 in cents
      currency: 'USD',
      description: 'Trendspotter Pro — Monthly',
      customer_email: userEmail,
      success_url: `${appUrl}/dashboard?upgrade=success`,
      cancel_url: `${appUrl}/pricing?upgrade=cancelled`,
      metadata: { user_id: userId },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Supertab API error ${res.status}: ${err?.message || err?.error || res.statusText}`
    );
  }

  const data = await res.json();
  return {
    checkoutUrl: data.checkout_url || data.url || data.payment_url,
    sessionId:   data.id || data.session_id || data.checkout_id,
  };
}

/**
 * Verify a Supertab webhook signature using HMAC-SHA256.
 * Supertab sends the signature in the X-Supertab-Signature header as a hex string.
 *
 * @param {string} rawBody   - Raw request body string
 * @param {string} signature - Value of the X-Supertab-Signature header
 * @returns {Promise<boolean>}
 */
export async function verifySupertabWebhook(rawBody, signature) {
  const secret = process.env.SUPERTAB_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('SUPERTAB_WEBHOOK_SECRET not set — skipping signature verification');
    return true; // Allow in dev if secret not configured
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes  = hexToUint8Array(signature);
    const bodyBytes = encoder.encode(rawBody);

    return crypto.subtle.verify('HMAC', key, sigBytes, bodyBytes);
  } catch {
    return false;
  }
}

function hexToUint8Array(hex) {
  const pairs = (hex || '').match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((b) => parseInt(b, 16)));
}
