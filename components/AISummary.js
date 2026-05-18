'use client';

import { useState, useEffect } from 'react';

const DEVTOOLBOX_API = 'https://devtoolbox.co/api/ai/summarize';

export default function AISummary() {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  async function fetchSummary() {
    setLoading(true);
    setError(null);

    try {
      // Fetch top 5 trending videos
      const trendsRes = await fetch('/api/trends?limit=5&sort=trending_score');
      if (!trendsRes.ok) throw new Error('Failed to fetch trends');
      const trendsData = await trendsRes.json();

      const titles = (trendsData.data || []).map((v) => v.title).filter(Boolean);
      if (titles.length === 0) {
        setSummary('No trending videos found to summarize.');
        return;
      }

      const prompt = `Summarize the following top trending YouTube video titles for a dropshipper or affiliate marketer. Identify any common themes, trending niches, or product opportunities:\n\n${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;

      // Call DevToolBox AI summarize API (no key required)
      const aiRes = await fetch(DEVTOOLBOX_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt }),
      });

      if (!aiRes.ok) {
        // Fallback: generate a simple summary ourselves
        setSummary(
          `Today's top trending topics include: ${titles.slice(0, 3).join(', ')}. These videos are gaining significant traction and may indicate emerging product opportunities.`
        );
        return;
      }

      const aiData = await aiRes.json();
      const result =
        aiData.summary ||
        aiData.result ||
        aiData.text ||
        aiData.output ||
        'Summary unavailable.';

      setSummary(result);
      setLastFetched(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Auto-fetch on mount
  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card border-blue-800 bg-blue-950/20">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-blue-300 flex items-center gap-2">
          <span>🤖</span> AI Trend Summary
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
          Last updated: {lastFetched.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
