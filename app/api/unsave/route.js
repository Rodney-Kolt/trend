// Alias: DELETE /api/unsave → POST /api/unsave-video
// The original uses POST; we expose both methods here for compatibility
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase';

async function handler(request) {
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
      return NextResponse.json({ error: 'Failed to unsave video' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST   = handler;
export const DELETE = handler;
