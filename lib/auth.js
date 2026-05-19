/**
 * Shared auth helper for API routes.
 *
 * Tries two methods in order:
 *  1. Cookie-based session (set by @supabase/ssr — works after SSR login)
 *  2. Bearer token from Authorization header (works for client-side fetch)
 *
 * Returns the authenticated user or null.
 */

import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function getAuthUser(request) {
  // ── Method 1: Cookie session ───────────────────────────────────────────────
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) return user;
  } catch {
    // Fall through to token method
  }

  // ── Method 2: Bearer token ─────────────────────────────────────────────────
  const authHeader = request?.headers?.get?.('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (token) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
      );
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) return user;
    } catch {
      // Both methods failed
    }
  }

  return null;
}
