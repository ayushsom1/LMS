import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const { data: test, error: testError } = await supabaseAdmin
      .from('tests')
      .select('*')
      .eq('access_code', code.toUpperCase())
      .single();

    if (testError || !test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Also fetch questions for the test-taking page
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('test_id', test.id)
      .order('order_index', { ascending: true });

    if (questionsError) {
      console.error('Failed to fetch questions:', questionsError);
    }

    // Filter out correct_answer from questions for student view
    const sanitizedQuestions = questions?.map((q) => ({
      ...q,
      correct_answer: undefined, // Hide correct answers
      test_cases: q.test_cases?.map((tc: { id: string; input: string; expected_output: string; is_hidden: boolean }) =>
        tc.is_hidden ? { ...tc, input: undefined, expected_output: undefined } : tc
      ),
    }));

    return NextResponse.json({
      test,
      questions: sanitizedQuestions,
    });
  } catch (error) {
    console.error('Failed to fetch test:', error);
    return NextResponse.json({ error: 'Failed to fetch test' }, { status: 500 });
  }
}
