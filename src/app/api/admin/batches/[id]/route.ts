import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET - Get batch with students
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: batch, error: batchError } = await supabaseAdmin
      .from('batches')
      .select('*')
      .eq('id', id)
      .single();

    if (batchError) throw batchError;

    const { data: students, error: studentsError } = await supabaseAdmin
      .from('batch_students')
      .select('*')
      .eq('batch_id', id)
      .order('created_at', { ascending: false });

    if (studentsError) throw studentsError;

    return NextResponse.json({ batch, students });
  } catch (error) {
    console.error('Failed to fetch batch:', error);
    return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 });
  }
}

// PUT - Update batch
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    const { data: batch, error } = await supabaseAdmin
      .from('batches')
      .update({ name, description })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(batch);
  } catch (error) {
    console.error('Failed to update batch:', error);
    return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 });
  }
}

// DELETE - Delete batch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('batches')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete batch:', error);
    return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 });
  }
}
