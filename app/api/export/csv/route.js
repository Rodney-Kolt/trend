import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/export/csv
 * Pro-only: returns a CSV of all trends from the last 30 days.
 */
export async function GET() {
  try {
    // Auth check
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Plan check
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.plan !== 'pro') {
      return NextResponse.json(
        { error: 'CSV export requires a Pro plan. Upgrade at /pricing.' },
        { status: 403 }
      );
    }

    // Fetch last 30 days of trends
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: trends, error: dbError } = await admin
      .from('trends')
      .select('title, channel_name, view_count, like_count, comment_count, trending_score, published_at, date_fetched')
      .gte('date_fetched', thirtyDaysAgo.toISOString().slice(0, 10))
      .order('date_fetched', { ascending: false })
      .order('trending_score', { ascending: false });

    if (dbError) {
      console.error('CSV export DB error:', dbError);
      return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 });
    }

    // Build CSV
    const headers = [
      'title',
      'channel_name',
      'view_count',
      'like_count',
      'comment_count',
      'trending_score',
      'published_at',
      'date_fetched',
    ];

    const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = (trends || []).map((row) =>
      headers.map((h) => escape(row[h])).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const filename = `trendspotter-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('GET /api/export/csv error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
