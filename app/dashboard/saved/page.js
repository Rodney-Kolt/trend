'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import VideoCard from '@/components/VideoCard';

// Force dynamic — requires auth
export const dynamic = 'force-dynamic';

export default function SavedVideosPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      fetchProfile(user.id);
      fetchSavedVideos();
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

  async function fetchSavedVideos() {
    setLoading(true);
    try {
      const res = await fetch('/api/saved-videos');
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
      // Remove from list immediately
      setVideos((prev) => prev.filter((v) => v.video_id !== videoId));
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="text-blue-400 hover:underline text-sm">
          ← Back to Feed
        </Link>
        <span className="text-lg font-bold text-blue-400">Saved Videos</span>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-video bg-gray-800 rounded-lg mb-3" />
                <div className="h-4 bg-gray-800 rounded mb-2" />
                <div className="h-3 bg-gray-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-4xl mb-3">🔖</p>
            <p className="text-lg font-medium">No saved videos yet</p>
            <p className="text-sm mt-1">
              Go to the{' '}
              <Link href="/dashboard" className="text-blue-400 hover:underline">
                trend feed
              </Link>{' '}
              and save videos you want to track.
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-4">
              {videos.length} saved video{videos.length !== 1 ? 's' : ''}
              {profile?.plan === 'free' && (
                <span className="ml-2 text-yellow-600">
                  · Free plan: {videos.length}/5 saves used
                </span>
              )}
            </p>
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
          </>
        )}
      </div>
    </div>
  );
}
