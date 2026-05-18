/**
 * YouTube Data API v3 helper
 * Fetches trending videos for a given region.
 */

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Fetch top trending videos from YouTube Data API v3.
 * @param {string} regionCode - ISO 3166-1 alpha-2 country code (default: 'US')
 * @param {number} maxResults - Number of results (max 50 per request)
 * @returns {Promise<Array>} Array of video objects
 */
export async function fetchTrendingVideos(regionCode = 'US', maxResults = 50) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set');

  const url = new URL(`${YOUTUBE_API_BASE}/videos`);
  url.searchParams.set('part', 'snippet,statistics');
  url.searchParams.set('chart', 'mostPopular');
  url.searchParams.set('regionCode', regionCode);
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `YouTube API error ${res.status}: ${err?.error?.message || res.statusText}`
    );
  }

  const data = await res.json();
  return (data.items || []).map(normalizeVideo);
}

/**
 * Normalize a raw YouTube API video item into our schema shape.
 */
function normalizeVideo(item) {
  const stats = item.statistics || {};
  const snippet = item.snippet || {};

  const viewCount = parseInt(stats.viewCount || '0', 10);
  const likeCount = parseInt(stats.likeCount || '0', 10);
  const commentCount = parseInt(stats.commentCount || '0', 10);

  return {
    video_id: item.id,
    title: snippet.title || '',
    channel_name: snippet.channelTitle || '',
    view_count: viewCount,
    like_count: likeCount,
    comment_count: commentCount,
    published_at: snippet.publishedAt || null,
    thumbnail_url:
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      null,
    trending_score: calcTrendingScore(viewCount, likeCount, commentCount),
    has_sponsorship: false, // placeholder — future ML feature
  };
}

/**
 * Trending Score formula:
 * (view_count * 0.5) + (like_count * 2) + (comment_count * 5)
 */
export function calcTrendingScore(viewCount, likeCount, commentCount) {
  return viewCount * 0.5 + likeCount * 2 + commentCount * 5;
}
