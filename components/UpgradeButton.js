'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import Link from 'next/link';

export default function UpgradeButton({ className = '', label }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    setNeedsLogin(false);

    try {
      // Get the current session token to send with the request
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Not logged in — redirect to login
        setNeedsLogin(true);
        setLoading(false);
        return;
      }

      const res = await fetch('/api/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          // Send the access token so the server can verify auth
          // even when the SSR cookie session isn't established
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start checkout');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 6000);
      setLoading(false);
    }
  }

  if (needsLogin) {
    return (
      <div className={className}>
        <Link
          href="/login?next=/pricing"
          className="btn-primary w-full py-3 text-base font-semibold text-center block"
        >
          Sign in to Upgrade
        </Link>
        <p className="text-gray-500 text-xs mt-2 text-center">
          You need to be signed in to upgrade.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="btn-primary w-full py-3 text-base font-semibold disabled:opacity-50"
        aria-label="Upgrade to Pro plan"
      >
        {loading
          ? 'Redirecting to checkout…'
          : label || '⚡ Upgrade to Pro — $19/mo'}
      </button>
      {error && (
        <p className="text-red-400 text-sm mt-2 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
