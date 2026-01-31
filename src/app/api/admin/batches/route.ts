import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET - List all batches with student count
export async function GET() {
  try {
    const { data: batches, error } = await supabaseAdmin
      .from('batches')
      .select(`
        *,
        batch_students(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform to include student_count
    const batchesWithCount = batches.map((batch: { batch_students: { count: number }[] } & Record<string, unknown>) => ({
      ...batch,
      student_count: batch.batch_students?.[0]?.count || 0,
      batch_students: undefined,
    }));

    return NextResponse.json(batchesWithCount);
  } catch (error) {
    console.error('Failed to fetch batches:', error);
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 });
  }
}

// POST - Create a new batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Batch name is required' }, { status: 400 });
    }

    const { data: batch, error } = await supabaseAdmin
      .from('batches')
      .insert({ name, description })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(batch);
  } catch (error) {
    console.error('Failed to create batch:', error);
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
  }
}
