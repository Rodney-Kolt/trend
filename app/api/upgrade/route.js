import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createCheckoutSession } from '@/lib/dodo';

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checkoutUrl, sessionId } = await createCheckoutSession(
      user.email,
      user.id
    );

    return NextResponse.json({ checkoutUrl, sessionId });
  } catch (err) {
    console.error('POST /api/upgrade error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
