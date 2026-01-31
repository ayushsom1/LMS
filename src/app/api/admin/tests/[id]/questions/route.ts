import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: questions, error } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('test_id', id)
      .order('order_index', { ascending: true });

    if (error) throw error;

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Failed to fetch questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      type,
      title,
      description,
      options,
      correct_answer,
      test_cases,
      points,
      order_index,
    } = body;

    if (!type || !title) {
      return NextResponse.json(
        { error: 'Type and title are required' },
        { status: 400 }
      );
    }

    const { data: question, error } = await supabaseAdmin
      .from('questions')
      .insert({
        test_id: id,
        type,
        title,
        description,
        options: type === 'mcq' ? options : null,
        correct_answer: type === 'mcq' ? correct_answer : null,
        test_cases: type === 'coding' ? test_cases : null,
        points: points || 10,
        order_index: order_index || 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error('Failed to create question:', error);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}
