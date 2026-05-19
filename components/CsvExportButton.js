'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';

export default function CsvExportButton({ className = '' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  async function handleExport() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const headers = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/export/csv', { headers });

      if (res.status === 403) {
        throw new Error('CSV export is a Pro feature. Upgrade to download.');
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Export failed');
      }

      const blob     = await res.blob();
      const url      = URL.createObjectURL(blob);
      const filename = `trendspotter-${new Date().toISOString().slice(0, 10)}.csv`;
      const a        = document.createElement('a');
      a.href         = url;
      a.download     = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <button
        onClick={handleExport}
        disabled={loading}
        className="btn-secondary flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-50"
        title="Download 30-day trend data as CSV (Pro)"
        aria-label="Export trends as CSV"
      >
        {loading ? <><span className="animate-spin">⏳</span> Exporting…</> : <>⬇ Export CSV</>}
      </button>
      {error && (
        <p className="text-red-400 text-xs mt-1" role="alert">{error}</p>
      )}
    </div>
  );
}
