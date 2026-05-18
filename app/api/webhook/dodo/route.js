import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { verifyWebhookSignature } from '@/lib/dodo';

// Disable body parsing so we can verify the raw signature
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('dodo-signature') || '';

    // Verify webhook authenticity
    const isValid = await verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('Dodo webhook: invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event?.type || event?.event_type;

    // Handle successful payment
    if (eventType === 'payment.succeeded' || eventType === 'checkout.completed') {
      const userId =
        event?.data?.metadata?.supabase_user_id ||
        event?.metadata?.supabase_user_id;

      if (!userId) {
        console.error('Dodo webhook: missing supabase_user_id in metadata', event);
        return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
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

      console.log(`User ${userId} upgraded to Pro`);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('POST /api/webhook/dodo error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
