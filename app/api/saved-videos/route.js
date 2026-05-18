import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Join saved_items with trends to get full video data
    const { data, error } = await admin
      .from('saved_items')
      .select(`
        id,
        saved_at,
        video_id,
        trends!inner (
          video_id,
          title,
          channel_name,
          view_count,
          like_count,
          comment_count,
          trending_score,
          published_at,
          thumbnail_url,
          date_fetched
        )
      `)
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false });

    if (error) {
      console.error('Fetch saved_videos error:', error);
      return NextResponse.json({ error: 'Failed to fetch saved videos' }, { status: 500 });
    }

    // Flatten the join result
    const videos = (data || []).map((item) => ({
      saved_id: item.id,
      saved_at: item.saved_at,
      ...item.trends,
    }));

    return NextResponse.json({ data: videos });
  } catch (err) {
    console.error('GET /api/saved-videos error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
