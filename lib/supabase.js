import { createClient } from '@supabase/supabase-js';

let browserClientInstance = null;

// Browser client (for client components — no server-only imports)
// Uses a singleton to avoid creating multiple instances
export function createBrowserClient() {
  if (typeof window === 'undefined') {
    // During SSR/prerender, return a dummy client that won't throw
    // Real calls only happen client-side after hydration
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'
    );
  }
  if (!browserClientInstance) {
    browserClientInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
    );
  }
  return browserClientInstance;
}

// Admin client with service role (for scripts and privileged server operations)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
