import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { parseQuestionsWorkbook } from '@/lib/excel-parser';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 });
    }

    const { data: test, error: testError } = await supabaseAdmin
      .from('tests')
      .select('id')
      .eq('id', id)
      .single();
    if (testError || !test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    const buffer = await file.arrayBuffer();
    const { rows, errors } = parseQuestionsWorkbook(buffer);

    if (errors.length > 0) {
      return NextResponse.json(
        { error: `${errors.length} row(s) failed validation`, errors },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid rows found' }, { status: 400 });
    }

    const { count: existingCount } = await supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('test_id', id);
    const base = existingCount ?? 0;

    const inserts = rows.map((r, i) => ({
      test_id: id,
      type: r.type,
      title: r.title,
      description: r.description || null,
      options: r.type === 'mcq' ? r.options : null,
      correct_answer: r.type === 'mcq' ? r.correct_answer : null,
      test_cases: r.type === 'coding' ? r.test_cases : null,
      allowed_languages: r.type === 'coding' ? r.allowed_languages : ['cpp'],
      points: r.points,
      order_index: base + i,
    }));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('questions')
      .insert(inserts)
      .select('id');

    if (insertError) throw insertError;

    return NextResponse.json({ inserted: inserted?.length ?? 0 }, { status: 201 });
  } catch (error) {
    console.error('Bulk question upload failed:', error);
    return NextResponse.json({ error: 'Bulk upload failed' }, { status: 500 });
  }
}
