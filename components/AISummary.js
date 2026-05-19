'use client';

import { useState, useEffect } from 'react';

export default function AISummary() {
  const [summary, setSummary]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [cached, setCached]         = useState(false);

  async function fetchSummary() {
    setLoading(true);
    setError(null);
    try {
      // Call the server-side summary API (uses DevToolBox + DB, cached 1hr)
      const res  = await fetch('/api/summary');
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to generate summary');

      setSummary(data.summary || 'No summary available.');
      setCached(data.cached || false);
      setLastFetched(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSummary(); }, []); // eslint-disable-line

  return (
    <div className="card border-blue-800 bg-blue-950/20">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-blue-300 flex items-center gap-2 text-sm">
          <span>🤖</span> AI Trend Summary
          {cached && (
            <span className="text-blue-600 text-xs font-normal">(cached)</span>
          )}
        </h2>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
          aria-label="Refresh AI summary"
        >
          {loading ? 'Generating…' : '↻ Refresh'}
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span className="animate-pulse">●</span>
          <span>Analyzing today&apos;s top trends…</span>
        </div>
      )}

      {error && !loading && (
        <p className="text-red-400 text-sm" role="alert">
          Could not generate summary: {error}
        </p>
      )}

      {summary && !loading && (
        <p className="text-gray-300 text-sm leading-relaxed">{summary}</p>
      )}

      {lastFetched && !loading && (
        <p className="text-gray-600 text-xs mt-2">
          Updated {lastFetched.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
