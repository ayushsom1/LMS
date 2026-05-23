import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sanitizeLanguages } from '@/lib/question-utils';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  try {
    const { qid } = await params;
    const body = await request.json();

    const {
      type,
      title,
      description,
      options,
      correct_answer,
      test_cases,
      allowed_languages,
      points,
      order_index,
    } = body;

    const { data: question, error } = await supabaseAdmin
      .from('questions')
      .update({
        type,
        title,
        description,
        options: type === 'mcq' ? options : null,
        correct_answer: type === 'mcq' ? correct_answer : null,
        test_cases: type === 'coding' ? test_cases : null,
        allowed_languages: type === 'coding' ? sanitizeLanguages(allowed_languages) : ['cpp'],
        points,
        order_index,
      })
      .eq('id', qid)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(question);
  } catch (error) {
    console.error('Failed to update question:', error);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  try {
    const { qid } = await params;

    const { error } = await supabaseAdmin.from('questions').delete().eq('id', qid);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete question:', error);
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
