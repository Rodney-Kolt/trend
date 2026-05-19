import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { verifySupertabWebhook } from '@/lib/supertab';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhook/supertab
 * Handles Supertab payment webhooks.
 * On payment.succeeded, upgrades the user's plan to 'pro'.
 */
export async function POST(request) {
  try {
    const rawBody  = await request.text();
    const signature = request.headers.get('x-supertab-signature') || '';

    // Verify webhook authenticity
    const isValid = await verifySupertabWebhook(rawBody, signature);
    if (!isValid) {
      console.warn('Supertab webhook: invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event     = JSON.parse(rawBody);
    const eventType = event?.event || event?.type || event?.event_type;

    console.log('Supertab webhook received:', eventType);

    // Handle successful payment
    if (eventType === 'payment.succeeded' || eventType === 'checkout.completed' || eventType === 'payment_intent.succeeded') {
      const userId =
        event?.data?.metadata?.user_id ||
        event?.metadata?.user_id        ||
        event?.data?.user_id;

      if (!userId) {
        console.error('Supertab webhook: missing user_id in metadata', JSON.stringify(event));
        return NextResponse.json({ error: 'Missing user_id in metadata' }, { status: 400 });
      }

      const admin = createAdminClient();
      const { error } = await admin
        .from('profiles')
        .update({ plan: 'pro' })
        .eq('id', userId);

      if (error) {
        console.error('Failed to upgrade user plan:', error);
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
      }

      console.log(`✅ User ${userId} upgraded to Pro via Supertab`);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('POST /api/webhook/supertab error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
