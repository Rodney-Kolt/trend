import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function handler(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { video_id } = await request.json();
    if (!video_id || typeof video_id !== 'string') {
      return NextResponse.json({ error: 'video_id is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('saved_items').delete()
      .eq('user_id', user.id).eq('video_id', video_id);

    if (error) {
      return NextResponse.json({ error: 'Failed to unsave video' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('unsave error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST   = handler;
export const DELETE = handler;
