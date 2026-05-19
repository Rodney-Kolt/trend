import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createBrowserClient } from '@/lib/supabase';
import { createSupertabCheckout } from '@/lib/supertab';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    let user = null;

    // ── Method 1: Cookie-based session (works when SSR session is set) ────────
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        user = data.user;
      }
    } catch {
      // Cookie method failed — try token method below
    }

    // ── Method 2: Bearer token from Authorization header ─────────────────────
    // The client sends its access token when the cookie session isn't available
    if (!user) {
      const authHeader = request.headers.get('authorization') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (token) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
        );
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data?.user) {
          user = data.user;
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checkoutUrl, sessionId } = await createSupertabCheckout(
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
