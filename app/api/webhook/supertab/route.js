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
 * On a completed purchase, upgrades the matching Supabase user to Pro.
 * The Supabase user_id is read from the offering/purchase metadata field
 * (set when creating the checkout session).
 */
export async function POST(request) {
  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: 'Could not read body' }, { status: 400 });
  }

  // ── Signature verification (Svix) ─────────────────────────────────────────
  const isValid = await verifySupertabWebhook(rawBody, request.headers);
  if (!isValid) {
    console.warn('Supertab webhook: invalid signature — rejecting');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = event?.type || '';
  console.log('Supertab webhook received:', eventType);

  // ── Handle purchase.completed_2025-04-01 ──────────────────────────────────
  if (eventType === 'purchase.completed_2025-04-01' || eventType === 'purchase.completed') {
    /*
     * Payload shape:
     * {
     *   type: "purchase.completed_2025-04-01",
     *   data: {
     *     id: "purchase.xxx",
     *     status: "completed",
     *     metadata: { supabase_user_id: "...", user_email: "..." },
     *     user: { id: "user.xxx", email: "...", ... },
     *     ...
     *   }
     * }
     */
    const userId = event?.data?.metadata?.supabase_user_id;
    if (!userId) {
      console.error('purchase.completed: missing supabase_user_id in metadata', event?.data?.metadata);
      return NextResponse.json({ error: 'Missing supabase_user_id in metadata' }, { status: 400 });
    }
    await upgradeUser(userId);
  }

  // ── Handle onetime_offering.purchasing_completed_2025-04-01 ───────────────
  else if (
    eventType === 'onetime_offering.purchasing_completed_2025-04-01' ||
    eventType === 'onetime_offering.purchasing_completed'
  ) {
    /*
     * Payload shape:
     * {
     *   type: "onetime_offering.purchasing_completed_2025-04-01",
     *   data: {
     *     id: "onetime_offering.xxx",
     *     status: "purchasing_completed",
     *     metadata: { supabase_user_id: "...", user_email: "..." },
     *     items: [ { metadata: { ... }, purchase: { ... } } ],
     *     ...
     *   }
     * }
     */
    const userId =
      event?.data?.metadata?.supabase_user_id ||
      // Also check first item's metadata as fallback
      event?.data?.items?.[0]?.metadata?.supabase_user_id;

    if (!userId) {
      console.error('onetime_offering: missing supabase_user_id in metadata', event?.data?.metadata);
      return NextResponse.json({ error: 'Missing supabase_user_id in metadata' }, { status: 400 });
    }
    await upgradeUser(userId);
  }

  else {
    // Unknown event type — acknowledge but don't process
    console.log('Supertab webhook: unhandled event type:', eventType);
  }

  return NextResponse.json({ received: true });
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
