'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SaveButton({ videoId, isSaved, onToggle, userPlan }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const endpoint = isSaved ? '/api/unsave-video' : '/api/save-video';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.limitReached) {
          // Redirect to pricing page
          router.push('/pricing?reason=limit');
          return;
        }
        throw new Error(data.error || 'Something went wrong');
      }

      if (onToggle) onToggle(videoId, !isSaved);
    } catch (err) {
      setError(err.message);
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isSaved
            ? 'bg-green-900/40 border border-green-700 text-green-300 hover:bg-red-900/40 hover:border-red-700 hover:text-red-300'
            : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-blue-900/40 hover:border-blue-700 hover:text-blue-300'
        }`}
        aria-label={isSaved ? 'Unsave video' : 'Save video'}
      >
        {loading ? '…' : isSaved ? '✓ Saved' : '+ Save'}
      </button>
      {error && (
        <p className="text-red-400 text-xs mt-1 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
