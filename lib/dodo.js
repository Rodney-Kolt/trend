/**
 * Dodo Payments integration helper.
 * Docs: https://docs.dodopayments.com
 */

const DODO_API_BASE = 'https://api.dodopayments.com/v1';

/**
 * Create a Dodo Payments checkout session for the Pro plan.
 * @param {string} userEmail - Customer email
 * @param {string} userId - Supabase user ID (stored as metadata)
 * @returns {Promise<{checkoutUrl: string, sessionId: string}>}
 */
export async function createCheckoutSession(userEmail, userId) {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) throw new Error('DODO_PAYMENTS_API_KEY is not set');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const res = await fetch(`${DODO_API_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      product_id: process.env.DODO_PRO_PRODUCT_ID,
      customer_email: userEmail,
      metadata: { supabase_user_id: userId },
      success_url: `${appUrl}/dashboard?upgrade=success`,
      cancel_url: `${appUrl}/pricing?upgrade=cancelled`,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Dodo Payments error ${res.status}: ${err?.message || res.statusText}`
    );
  }

  const data = await res.json();
  return {
    checkoutUrl: data.checkout_url || data.url,
    sessionId: data.id || data.session_id,
  };
}

/**
 * Verify a Dodo Payments webhook signature.
 * Uses HMAC-SHA256 to validate the payload.
 * @param {string} rawBody - Raw request body string
 * @param {string} signature - Value of the 'dodo-signature' header
 * @returns {boolean}
 */
export async function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) throw new Error('DODO_WEBHOOK_SECRET is not set');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // Dodo sends signature as hex string
  const sigBytes = hexToUint8Array(signature);
  const bodyBytes = encoder.encode(rawBody);

  return crypto.subtle.verify('HMAC', key, sigBytes, bodyBytes);
}

function hexToUint8Array(hex) {
  const pairs = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((byte) => parseInt(byte, 16)));
}
