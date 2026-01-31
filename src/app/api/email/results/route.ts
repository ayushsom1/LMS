import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendResultsEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submissionId, testId } = body;

    if (!submissionId || !testId) {
      return NextResponse.json(
        { error: 'Submission ID and Test ID are required' },
        { status: 400 }
      );
    }

    // Get the submission
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Get the test
    const { data: test, error: testError } = await supabaseAdmin
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError || !test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Get questions to calculate max score
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('points')
      .eq('test_id', testId);

    if (questionsError) throw questionsError;

    const maxScore = questions.reduce((sum: number, q: { points: number }) => sum + q.points, 0);

    // Send email
    const result = await sendResultsEmail({
      to: submission.student_email,
      studentName: submission.student_name,
      testTitle: test.title,
      mcqScore: submission.mcq_score,
      codingScore: submission.coding_score,
      totalScore: submission.total_score,
      maxScore,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send results email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
