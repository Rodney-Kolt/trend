'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VideoCard from '@/components/VideoCard';
import AISummary from '@/components/AISummary';
import Navbar from '@/components/Navbar';
import CsvExportButton from '@/components/CsvExportButton';

export const dynamic = 'force-dynamic';

const FREE_SAVE_LIMIT = 5;

export default function DashboardPage() {
  const router   = useRouter();
  const supabase = createBrowserClient();

  const [user, setUser]             = useState(null);
  const [profile, setProfile]       = useState(null);
  const [videos, setVideos]         = useState([]);
  const [savedIds, setSavedIds]     = useState(new Set());
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading]       = useState(true);
  const [dataSource, setDataSource] = useState(null); // 'db' | 'live'
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [sort, setSort]             = useState('trending_score');
  const [searchInput, setSearchInput] = useState('');
  const [upgradeMessage, setUpgradeMessage] = useState(false);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      setUser(user);
      fetchProfile(user.id);
      fetchSavedIds();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles').select('plan').eq('id', userId).single();
    setProfile(data);
  }

  async function fetchSavedIds() {
    const res = await fetch('/api/saved');
    if (res.ok) {
      const data = await res.json();
      setSavedIds(new Set((data.data || []).map((v) => v.video_id)));
    }
  }

  // ── Fetch videos: DB first, live YouTube fallback ─────────────────────────
  const fetchVideos = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort, page: String(page), limit: '18' });
      if (search) params.set('search', search);

      const dbRes  = await fetch(`/api/trends?${params}`);
      const dbData = await dbRes.json();

      if (dbRes.ok && (dbData.data?.length ?? 0) > 0) {
        setVideos(dbData.data);
        setPagination(dbData.pagination || { page: 1, totalPages: 1, total: 0 });
        setDataSource('db');
        return;
      }

      // DB empty — fall back to live YouTube (page 1, no search only)
      if (page === 1 && !search) {
        const liveRes  = await fetch('/api/trends/live');
        const liveData = await liveRes.json();
        if (!liveRes.ok) throw new Error(liveData.error || 'Failed to fetch live trends');

        const sortFns = {
          trending_score: (a, b) => b.trending_score - a.trending_score,
          view_count:     (a, b) => b.view_count - a.view_count,
          like_count:     (a, b) => b.like_count - a.like_count,
          date_fetched:   (a, b) => new Date(b.published_at) - new Date(a.published_at),
        };
        const items = [...(liveData.data || [])].sort(sortFns[sort] || sortFns.trending_score);
        setVideos(items);
        setPagination({ page: 1, totalPages: 1, total: items.length });
        setDataSource('live');
      } else {
        setVideos([]);
        setPagination({ page: 1, totalPages: 1, total: 0 });
        setDataSource('live');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sort, search]);

  useEffect(() => {
    if (user) fetchVideos(1);
  }, [user, sort, search, fetchVideos]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleSaveToggle(videoId, nowSaved) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      nowSaved ? next.add(videoId) : next.delete(videoId);
      return next;
    });
    if (nowSaved && profile?.plan === 'free' && savedIds.size + 1 >= FREE_SAVE_LIMIT) {
      setUpgradeMessage(true);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setSearch(searchInput);
  }

  const isPro = profile?.plan === 'pro';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} plan={profile?.plan} savedCount={savedIds.size} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex flex-col gap-6">

        {/* Upgrade success banner */}
        {typeof window !== 'undefined' &&
          new URLSearchParams(window.location.search).get('upgrade') === 'success' && (
          <div className="bg-green-900/30 border border-green-700 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="text-green-300 font-semibold">Welcome to Pro!</p>
              <p className="text-green-400 text-sm">You now have unlimited saves, 30-day history, and CSV export.</p>
            </div>
          </div>
        )}

        {/* Live data banner */}
        {dataSource === 'live' && !loading && (
          <div className="bg-blue-950/40 border border-blue-800 rounded-xl px-4 py-2.5 flex items-center gap-3 text-sm">
            <span className="text-blue-400">🔴</span>
            <span className="text-blue-300">
              Showing <strong>live YouTube data</strong> — database populates after the first daily scrape.
            </span>
          </div>
        )}

        {/* AI Summary */}
        <AISummary />

        {/* Upgrade nudge */}
        {upgradeMessage && !isPro && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-yellow-300 text-sm">
              You&apos;ve reached the 5-save free limit. Upgrade to Pro for unlimited saves.
            </p>
            <div className="flex gap-2 shrink-0">
              <Link href="/pricing" className="btn-primary text-xs px-3 py-1.5">Upgrade ⚡</Link>
              <button onClick={() => setUpgradeMessage(false)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
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
            <button type="submit" className="btn-secondary px-4 shrink-0">Search</button>
            {search && (
              <button type="button" className="btn-secondary px-3 shrink-0"
                onClick={() => { setSearch(''); setSearchInput(''); }}>✕</button>
            )}
          </form>

          <div className="flex gap-2 items-center flex-wrap">
            <label htmlFor="sort" className="text-sm text-gray-400 shrink-0">Sort:</label>
            <select id="sort" className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="trending_score">Trending Score</option>
              <option value="date_fetched">Date Fetched</option>
              <option value="view_count">View Count</option>
              <option value="like_count">Like Count</option>
            </select>
            {isPro && <CsvExportButton />}
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
          <span>{pagination.total} videos</span>
          {dataSource === 'db'   && <span className="text-green-600">· from database</span>}
          {dataSource === 'live' && <span className="text-blue-600">· live from YouTube</span>}
          {search && <span>· &quot;{search}&quot;</span>}
          {!isPro && (
            <span className="ml-auto text-yellow-600 text-xs">
              Free · {savedIds.size}/{FREE_SAVE_LIMIT} saves used
            </span>
          )}
        </div>

        {/* Error */}
        {error && !loading && (
          <div className="card border-red-900 bg-red-950/20 text-center py-8">
            <p className="text-3xl mb-3">⚠️</p>
            <p className="text-red-400 font-medium mb-1">Failed to load videos</p>
            <p className="text-gray-500 text-sm font-mono">{error}</p>
            <button onClick={() => fetchVideos(1)} className="btn-primary mt-4 text-sm px-4 py-2">Retry</button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-video bg-gray-800 rounded-lg mb-3" />
                <div className="h-4 bg-gray-800 rounded mb-2" />
                <div className="h-3 bg-gray-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && videos.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-lg font-medium">No videos found</p>
            <p className="text-sm mt-1">
              {search ? 'Try a different search term.' : 'Could not load videos. Check your API key.'}
            </p>
            <button onClick={() => fetchVideos(1)} className="btn-secondary mt-4 text-sm px-4 py-2">Retry</button>
          </div>
        )}

        {/* Video grid */}
        {!loading && !error && videos.length > 0 && (
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

        {/* Pagination (DB mode only) */}
        {!loading && pagination.totalPages > 1 && dataSource === 'db' && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <button onClick={() => fetchVideos(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="btn-secondary text-sm px-4 py-2 disabled:opacity-40">← Prev</button>
            <span className="text-gray-400 text-sm">Page {pagination.page} of {pagination.totalPages}</span>
            <button onClick={() => fetchVideos(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="btn-secondary text-sm px-4 py-2 disabled:opacity-40">Next →</button>
          </div>
        )}
      </main>
    </div>
  );
}
