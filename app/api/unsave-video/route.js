import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase';

export async function POST(request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { video_id } = body;

    if (!video_id || typeof video_id !== 'string') {
      return NextResponse.json({ error: 'video_id is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from('saved_items')
      .delete()
      .eq('user_id', user.id)
      .eq('video_id', video_id);

    if (error) {
      console.error('Delete saved_items error:', error);
      return NextResponse.json({ error: 'Failed to unsave video' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/unsave-video error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
