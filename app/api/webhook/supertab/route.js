import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { verifySupertabWebhook } from '@/lib/supertab';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhook/supertab
 *
 * Handles Supertab payment webhooks (delivered via Svix).
 *
 * Supported event types:
 *   - purchase.completed_2025-04-01
 *   - onetime_offering.purchasing_completed_2025-04-01
 *
 * The supabase_user_id is read from:
 *   1. event.data.metadata.supabase_user_id  (offering-level metadata)
 *   2. event.data.items[0].metadata.supabase_user_id  (item-level metadata)
 *   3. Parsed from metadata string if it's URL-encoded (Off-App Purchase flow)
 */
export async function POST(request) {
  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: 'Could not read body' }, { status: 400 });
  }

  // ── Signature verification ─────────────────────────────────────────────────
  const isValid = await verifySupertabWebhook(rawBody, request.headers);
  if (!isValid) {
    console.warn('Supertab webhook: invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = event?.type || '';
  console.log('Supertab webhook:', eventType);

  // ── purchase.completed ─────────────────────────────────────────────────────
  if (
    eventType === 'purchase.completed_2025-04-01' ||
    eventType === 'purchase.completed'
  ) {
    /*
     * data.metadata may be:
     *   - object: { supabase_user_id: "..." }
     *   - string: "supabase_user_id=...&user_email=..." (URL-encoded from Off-App flow)
     */
    const userId = extractUserId(event?.data?.metadata);
    if (!userId) {
      console.error('purchase.completed: no supabase_user_id found', event?.data?.metadata);
      return NextResponse.json({ error: 'Missing supabase_user_id' }, { status: 400 });
    }
    await upgradeUser(userId);
  }

  // ── onetime_offering.purchasing_completed ──────────────────────────────────
  else if (
    eventType === 'onetime_offering.purchasing_completed_2025-04-01' ||
    eventType === 'onetime_offering.purchasing_completed'
  ) {
    // Try offering-level metadata first, then first item's metadata
    const userId =
      extractUserId(event?.data?.metadata) ||
      extractUserId(event?.data?.items?.[0]?.metadata) ||
      extractUserId(event?.data?.items?.[0]?.purchase?.metadata);

    if (!userId) {
      console.error('onetime_offering: no supabase_user_id found', event?.data?.metadata);
      return NextResponse.json({ error: 'Missing supabase_user_id' }, { status: 400 });
    }
    await upgradeUser(userId);
  }

  else {
    console.log('Supertab webhook: unhandled event type:', eventType);
  }

  return NextResponse.json({ received: true });
}

/**
 * Extract supabase_user_id from metadata.
 * Handles both object and URL-encoded string formats.
 */
function extractUserId(metadata) {
  if (!metadata) return null;

  // Object format: { supabase_user_id: "..." }
  if (typeof metadata === 'object') {
    return metadata.supabase_user_id || null;
  }

  // String format: "supabase_user_id=xxx&user_email=yyy" (URL-encoded)
  if (typeof metadata === 'string') {
    try {
      const params = new URLSearchParams(metadata);
      return params.get('supabase_user_id') || null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Upgrade a Supabase user's plan to 'pro'.
 */
async function upgradeUser(userId) {
  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ plan: 'pro' })
    .eq('id', userId);

  if (error) {
    console.error(`Failed to upgrade user ${userId}:`, error);
    throw new Error('DB update failed');
  }

  console.log(`✅ User ${userId} upgraded to Pro via Supertab`);
}
