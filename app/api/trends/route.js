import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

// Force dynamic rendering — this route reads request.url (search params)
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'trending_score';
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20', 10));
    const offset = (page - 1) * limit;

    // Validate sort column to prevent injection
    const allowedSorts = ['trending_score', 'date_fetched', 'view_count', 'like_count'];
    const sortColumn = allowedSorts.includes(sort) ? sort : 'trending_score';

    const supabase = createAdminClient();

    let query = supabase
      .from('trends')
      .select('*', { count: 'exact' })
      .order(sortColumn, { ascending: false })
      .range(offset, offset + limit - 1);

    if (search.trim()) {
      query = query.ilike('title', `%${search.trim()}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error('GET /api/trends error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
