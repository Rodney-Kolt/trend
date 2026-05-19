import { NextResponse } from 'next/server';
import { fetchTrendingVideos } from '@/lib/youtube';
import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/trends/live
 * Fetches trending videos directly from YouTube API and upserts into Supabase.
 * Used to seed the database and serve fresh data when the DB is empty.
 */
export async function GET() {
  try {
    // 1. Fetch from YouTube
    const videos = await fetchTrendingVideos('US', 50);

    // 2. Try to upsert into Supabase (best-effort — don't fail if DB not ready)
    const dateToday = new Date().toISOString().slice(0, 10);
    try {
      const admin = createAdminClient();
      const rows = videos.map((v) => ({
        video_id: v.video_id,
        title: v.title,
        channel_name: v.channel_name,
        view_count: v.view_count,
        like_count: v.like_count,
        comment_count: v.comment_count,
        trending_score: v.trending_score,
        published_at: v.published_at,
        thumbnail_url: v.thumbnail_url,
        date_fetched: dateToday,
      }));
      await admin
        .from('trends')
        .upsert(rows, { onConflict: 'video_id,date_fetched' });
    } catch (dbErr) {
      // DB might not be set up yet — log but don't fail the response
      console.warn('DB upsert skipped:', dbErr.message);
    }

    // 3. Return the live data
    return NextResponse.json({
      data: videos,
      source: 'youtube_live',
      pagination: {
        page: 1,
        limit: videos.length,
        total: videos.length,
        totalPages: 1,
      },
    });
  } catch (err) {
    console.error('GET /api/trends/live error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch live trends' },
      { status: 500 }
    );
  }
}
