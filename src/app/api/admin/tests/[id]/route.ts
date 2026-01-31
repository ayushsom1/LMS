import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

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
    const { title, duration_minutes, is_active } = body;

    const { data: test, error } = await supabaseAdmin
      .from('tests')
      .update({
        title,
        duration_minutes,
        is_active,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

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

    const { error } = await supabaseAdmin.from('tests').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete test:', error);
    return NextResponse.json({ error: 'Failed to delete test' }, { status: 500 });
  }
}
