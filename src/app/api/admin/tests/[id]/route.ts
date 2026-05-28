import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { cacheDel } from '@/lib/redis';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: test, error } = await supabaseAdmin
      .from('tests')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json(test);
  } catch (error) {
    console.error('Failed to fetch test:', error);
    return NextResponse.json({ error: 'Failed to fetch test' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, duration_minutes, is_active, starts_at, ends_at } = body;

    if (starts_at && ends_at && new Date(ends_at) <= new Date(starts_at)) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    const { data: test, error } = await supabaseAdmin
      .from('tests')
      .update({
        title,
        duration_minutes,
        is_active,
        starts_at: starts_at || null,
        ends_at: ends_at || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (test?.access_code) {
      await cacheDel(`test:${test.access_code.toUpperCase()}`);
    }

    return NextResponse.json(test);
  } catch (error) {
    console.error('Failed to update test:', error);
    return NextResponse.json({ error: 'Failed to update test' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch access_code first so we can invalidate the Redis cache after delete.
    // FKs on questions/submissions/test_batches use ON DELETE CASCADE, so a single
    // DELETE on tests removes everything downstream.
    const { data: existing } = await supabaseAdmin
      .from('tests')
      .select('access_code')
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin.from('tests').delete().eq('id', id);

    if (error) throw error;

    if (existing?.access_code) {
      await cacheDel(`test:${existing.access_code.toUpperCase()}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete test:', error);
    return NextResponse.json({ error: 'Failed to delete test' }, { status: 500 });
  }
}
