'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VideoCard from '@/components/VideoCard';
import Navbar from '@/components/Navbar';
import CsvExportButton from '@/components/CsvExportButton';

export const dynamic = 'force-dynamic';

const FREE_SAVE_LIMIT = 5;

export default function SavedPage() {
  const router   = useRouter();
  const supabase = createBrowserClient();

  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [videos, setVideos]   = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      setUser(session.user);
      fetchProfile(session.user.id);
      fetchSavedVideos(session.access_token);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles').select('plan').eq('id', userId).single();
    setProfile(data);
  }

  async function fetchSavedVideos(token) {
    setLoading(true);
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/saved', { headers });
      if (res.ok) {
        const data = await res.json();
        const vids = data.data || [];
        setVideos(vids);
        setSavedIds(new Set(vids.map((v) => v.video_id)));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSaveToggle(videoId, nowSaved) {
    if (!nowSaved) {
      setVideos((prev) => prev.filter((v) => v.video_id !== videoId));
      setSavedIds((prev) => { const n = new Set(prev); n.delete(videoId); return n; });
    }
  }

  const isPro = profile?.plan === 'pro';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} plan={profile?.plan} savedCount={savedIds.size} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Saved Videos</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {isPro
                ? `${videos.length} saved · unlimited`
                : `${videos.length} / ${FREE_SAVE_LIMIT} saved · free plan`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isPro && <CsvExportButton />}
            {!isPro && (
              <Link href="/pricing" className="btn-primary text-sm px-4 py-2">
                ⚡ Upgrade for unlimited
              </Link>
            )}
          </div>
        </div>

        {/* Free tier progress bar */}
        {!isPro && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Saves used</span>
              <span>{videos.length} / {FREE_SAVE_LIMIT}</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  videos.length >= FREE_SAVE_LIMIT ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, (videos.length / FREE_SAVE_LIMIT) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-video bg-gray-800 rounded-lg mb-3" />
                <div className="h-4 bg-gray-800 rounded mb-2" />
                <div className="h-3 bg-gray-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && videos.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-5xl mb-4">🔖</p>
            <p className="text-lg font-medium mb-1">No saved videos yet</p>
            <p className="text-sm mb-6">Browse the trend feed and save videos you want to track.</p>
            <Link href="/dashboard" className="btn-primary px-5 py-2.5">
              Browse Trending Feed →
            </Link>
          </div>
        )}

        {/* Grid */}
        {!loading && videos.length > 0 && (
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
      </main>
    </div>
  );
}
