import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireStudent, isResponse } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireStudent();
    if (isResponse(auth)) return auth;

    const normalizedEmail = auth.email.toLowerCase().trim();

    // Get the submission — verify it belongs to this email
    const { data: submission, error: subError } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('id', id)
      .eq('student_email', normalizedEmail)
      .single();

    if (subError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Get test details
    const { data: test, error: testError } = await supabaseAdmin
      .from('tests')
      .select('*')
      .eq('id', submission.test_id)
      .single();

    if (testError || !test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Get questions (hide correct answers and hidden test case details)
    const { data: questions, error: qError } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('test_id', test.id)
      .order('order_index', { ascending: true });

    if (qError) throw qError;

    // For graded submissions, show which MCQ answers were correct/wrong
    // but don't reveal the actual correct answer for wrong ones
    const sanitizedQuestions = questions?.map((q) => {
      const studentAnswer = submission.answers?.[q.id];

      if (q.type === 'mcq') {
        return {
          ...q,
          // Show if student's answer was correct, but don't reveal the correct answer
          student_correct: studentAnswer === q.correct_answer,
          correct_answer: studentAnswer === q.correct_answer ? q.correct_answer : undefined,
        };
      }

      // For coding questions, show test cases but hide hidden ones
      return {
        ...q,
        correct_answer: undefined,
        test_cases: q.test_cases?.map((tc: { id: string; input: string; expected_output: string; is_hidden: boolean }) =>
          tc.is_hidden ? { ...tc, input: '[hidden]', expected_output: '[hidden]' } : tc
        ),
      };
    });

    return NextResponse.json({
      submission,
      test,
      questions: sanitizedQuestions,
    });
  } catch (error) {
    console.error('Failed to fetch submission detail:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
