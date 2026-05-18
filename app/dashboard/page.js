'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VideoCard from '@/components/VideoCard';
import AISummary from '@/components/AISummary';

// Force dynamic — this page requires auth and live data
export const dynamic = 'force-dynamic';

const FREE_SAVE_LIMIT = 5;

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('trending_score');
  const [searchInput, setSearchInput] = useState('');
  const [upgradeMessage, setUpgradeMessage] = useState(false);

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      fetchProfile(user.id);
      fetchSavedIds();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single();
    setProfile(data);
  }

  async function fetchSavedIds() {
    const res = await fetch('/api/saved-videos');
    if (res.ok) {
      const data = await res.json();
      setSavedIds(new Set((data.data || []).map((v) => v.video_id)));
    }
  }

  const fetchVideos = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          sort,
          page: String(page),
          limit: '18',
        });
        if (search) params.set('search', search);

        const res = await fetch(`/api/trends?${params}`);
        const data = await res.json();
        setVideos(data.data || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      } finally {
        setLoading(false);
      }
    },
    [sort, search]
  );

  useEffect(() => {
    if (user) fetchVideos(1);
  }, [user, sort, search, fetchVideos]);

  function handleSaveToggle(videoId, nowSaved) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (nowSaved) {
        next.add(videoId);
      } else {
        next.delete(videoId);
      }
      return next;
    });

    // Show upgrade nudge if free user is near limit
    if (nowSaved && profile?.plan === 'free' && savedIds.size + 1 >= FREE_SAVE_LIMIT) {
      setUpgradeMessage(true);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setSearch(searchInput);
  }

  async function handleDownloadCSV() {
    const res = await fetch('/api/trends?limit=50&sort=trending_score');
    const data = await res.json();
    const rows = data.data || [];

    const headers = ['title', 'channel_name', 'view_count', 'like_count', 'comment_count', 'trending_score', 'published_at', 'date_fetched'];
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trendspotter-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const isPro = profile?.plan === 'pro';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="text-lg font-bold text-blue-400 shrink-0">
          📈 Trendspotter
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {isPro ? (
            <span className="bg-yellow-900/40 text-yellow-300 border border-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium">
              ⚡ Pro
            </span>
          ) : (
            <Link href="/pricing" className="text-blue-400 hover:underline">
              Upgrade to Pro
            </Link>
          )}
          <Link href="/dashboard/saved" className="btn-secondary text-xs px-3 py-1.5">
            Saved ({savedIds.size})
          </Link>
          <button onClick={handleSignOut} className="text-gray-500 hover:text-gray-300 transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* AI Summary */}
        <AISummary />

        {/* Upgrade nudge */}
        {upgradeMessage && !isPro && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-yellow-300 text-sm">
              You&apos;ve saved {FREE_SAVE_LIMIT} videos — the free limit. Upgrade to Pro to save unlimited videos.
            </p>
            <div className="flex gap-2 shrink-0">
              <Link href="/pricing" className="btn-primary text-xs px-3 py-1.5">
                Upgrade
              </Link>
              <button
                onClick={() => setUpgradeMessage(false)}
                className="text-gray-500 hover:text-gray-300 text-xs"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 min-w-0 max-w-md">
            <input
              type="search"
              className="input flex-1"
              placeholder="Search videos…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search videos"
            />
            <button type="submit" className="btn-secondary px-4 shrink-0">
              Search
            </button>
            {search && (
              <button
                type="button"
                className="btn-secondary px-3 shrink-0"
                onClick={() => { setSearch(''); setSearchInput(''); }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </form>

          <div className="flex gap-2 items-center">
            <label htmlFor="sort" className="text-sm text-gray-400 shrink-0">
              Sort by:
            </label>
            <select
              id="sort"
              className="input w-auto"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="trending_score">Trending Score</option>
              <option value="date_fetched">Date Fetched</option>
              <option value="view_count">View Count</option>
              <option value="like_count">Like Count</option>
            </select>

            {isPro && (
              <button
                onClick={handleDownloadCSV}
                className="btn-secondary text-sm px-3 py-2 shrink-0"
                title="Download CSV (Pro)"
              >
                ⬇ CSV
              </button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{pagination.total} videos found</span>
          {search && <span>· Filtered by &quot;{search}&quot;</span>}
          {!isPro && (
            <span className="ml-auto text-yellow-600">
              Free plan · {savedIds.size}/{FREE_SAVE_LIMIT} saves used
            </span>
          )}
        </div>

        {/* Video grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-video bg-gray-800 rounded-lg mb-3" />
                <div className="h-4 bg-gray-800 rounded mb-2" />
                <div className="h-3 bg-gray-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-lg font-medium">No videos found</p>
            <p className="text-sm mt-1">
              {search
                ? 'Try a different search term.'
                : 'The daily scraper hasn\'t run yet. Check back tomorrow or run the script manually.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <VideoCard
                key={video.video_id}
                video={video}
                isSaved={savedIds.has(video.video_id)}
                onSaveToggle={handleSaveToggle}
                userPlan={profile?.plan}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => fetchVideos(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="btn-secondary text-sm px-4 py-2 disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-gray-400 text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchVideos(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="btn-secondary text-sm px-4 py-2 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
