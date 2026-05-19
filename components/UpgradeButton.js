'use client';

import { useState } from 'react';

export default function UpgradeButton({ className = '', label }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/upgrade', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout');
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
      setLoading(false);
    }
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
