'use client';

import Image from 'next/image';
import SaveButton from './SaveButton';

/**
 * Formats a large number with K/M suffix.
 */
function formatCount(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Formats a trending score for display.
 */
function formatScore(score) {
  if (score >= 1_000_000) return `${(score / 1_000_000).toFixed(2)}M`;
  if (score >= 1_000) return `${(score / 1_000).toFixed(1)}K`;
  return Math.round(score).toLocaleString();
}

export default function VideoCard({ video, isSaved, onSaveToggle, userPlan }) {
  const youtubeUrl = `https://www.youtube.com/watch?v=${video.video_id}`;

  return (
    <article className="card flex flex-col gap-3 hover:border-gray-700 transition-colors">
      {/* Thumbnail */}
      <a
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-video rounded-lg overflow-hidden bg-gray-800"
        aria-label={`Watch ${video.title} on YouTube`}
      >
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-4xl">
            ▶
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40">
          <span className="text-white text-4xl">▶</span>
        </div>
      </a>

      {/* Content */}
      <div className="flex flex-col gap-1 flex-1">
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sm leading-snug hover:text-blue-400 transition-colors line-clamp-2"
        >
          {video.title}
        </a>
        <p className="text-gray-500 text-xs">{video.channel_name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-800 rounded-lg py-1.5">
          <p className="text-xs text-gray-500">Views</p>
          <p className="text-sm font-semibold">{formatCount(video.view_count)}</p>
        </div>
        <div className="bg-gray-800 rounded-lg py-1.5">
          <p className="text-xs text-gray-500">Likes</p>
          <p className="text-sm font-semibold">{formatCount(video.like_count)}</p>
        </div>
        <div className="bg-blue-900/40 border border-blue-800 rounded-lg py-1.5">
          <p className="text-xs text-blue-400">Score</p>
          <p className="text-sm font-bold text-blue-300">{formatScore(video.trending_score)}</p>
        </div>
      </div>

      {/* Save button */}
      <SaveButton
        videoId={video.video_id}
        isSaved={isSaved}
        onToggle={onSaveToggle}
        userPlan={userPlan}
      />
    </article>
  );
}
