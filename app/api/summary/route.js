import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { summarize, buildTrendPrompt } from '@/lib/devtoolbox';

export const dynamic = 'force-dynamic';

// Simple in-memory cache — resets on cold start (good enough for serverless)
let cache = { summary: null, cachedAt: 0 };
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    // Return cached result if fresh
    if (cache.summary && Date.now() - cache.cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({ summary: cache.summary, cached: true });
    }

    const admin = createAdminClient();

    // Fetch top 5 trending videos by score
    const { data: videos, error } = await admin
      .from('trends')
      .select('title, channel_name, trending_score')
      .order('trending_score', { ascending: false })
      .limit(5);

    if (error) {
      console.error('summary: DB error', error);
      return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 });
    }

    const titles = (videos || []).map((v) => v.title).filter(Boolean);

    if (titles.length === 0) {
      return NextResponse.json({
        summary: 'No trending data available yet. Check back after the first daily scrape.',
        cached: false,
      });
    }

    const prompt = buildTrendPrompt(titles);

    let summaryText;
    try {
      summaryText = await summarize(prompt);
    } catch (aiErr) {
      // Graceful fallback — don't fail the whole request
      console.warn('DevToolBox AI failed:', aiErr.message);
      summaryText =
        `Today's top trending topics: ${titles.slice(0, 3).join(', ')}. ` +
        `These videos are gaining significant traction and may indicate emerging product opportunities.`;
    }

    // Update cache
    cache = { summary: summaryText, cachedAt: Date.now() };

    return NextResponse.json({ summary: summaryText, cached: false });
  } catch (err) {
    console.error('GET /api/summary error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
