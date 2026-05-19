import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';

const FREE_SAVE_LIMIT = 5;

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { video_id } = body;

    if (!video_id || typeof video_id !== 'string') {
      return NextResponse.json({ error: 'video_id is required' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from('profiles').select('plan').eq('id', user.id).single();
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { data: existing } = await admin
      .from('saved_items').select('id')
      .eq('user_id', user.id).eq('video_id', video_id).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Video already saved' }, { status: 409 });
    }

    if (profile.plan === 'free') {
      const { count } = await admin
        .from('saved_items').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if ((count || 0) >= FREE_SAVE_LIMIT) {
        return NextResponse.json(
          { error: 'Save limit reached', message: 'Upgrade to Pro to save unlimited videos.', limitReached: true },
          { status: 403 }
        );
      }
    }

    const { data, error } = await admin
      .from('saved_items').insert({ user_id: user.id, video_id }).select().single();
    if (error) {
      console.error('Insert saved_items error:', error);
      return NextResponse.json({ error: 'Failed to save video' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('POST /api/save-video error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
