'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';

export default function Navbar({ user, plan, savedCount = 0 }) {
  const router   = useRouter();
  const pathname = usePathname();
  const supabase = createBrowserClient();

  const isPro = plan === 'pro';

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  function isActive(href) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href={user ? '/dashboard' : '/'} className="text-lg font-bold text-blue-400 shrink-0 flex items-center gap-2">
          📈 <span className="hidden sm:inline">Trendspotter</span>
        </Link>

        {/* Nav links — only when logged in */}
        {user && (
          <div className="flex items-center gap-1 text-sm">
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                isActive('/dashboard') && !isActive('/dashboard/saved')
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              Feed
            </Link>
            <Link
              href="/saved"
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                isActive('/saved')
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              Saved
              {savedCount > 0 && (
                <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                  {savedCount}
                </span>
              )}
            </Link>
            <Link
              href="/pricing"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                isActive('/pricing')
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              Pricing
            </Link>
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              {isPro ? (
                <span className="hidden sm:flex items-center gap-1 bg-yellow-900/40 text-yellow-300 border border-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  ⚡ Pro
                </span>
              ) : (
                <Link
                  href="/pricing"
                  className="hidden sm:inline-flex btn-primary text-xs px-3 py-1.5"
                >
                  Upgrade ⚡
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-300 text-sm transition-colors px-2 py-1"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary text-sm px-3 py-1.5">
                Sign in
              </Link>
              <Link href="/login" className="btn-primary text-sm px-3 py-1.5">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
