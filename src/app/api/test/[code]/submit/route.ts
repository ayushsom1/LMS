import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { evaluateCode } from '@/lib/piston';
import { Question, TestCase } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { submissionId, answers } = body;

    if (!submissionId || !answers) {
      return NextResponse.json(
        { error: 'Submission ID and answers are required' },
        { status: 400 }
      );
    }

    // Find the test
    const { data: test, error: testError } = await supabaseAdmin
      .from('tests')
      .select('*')
      .eq('access_code', code.toUpperCase())
      .single();

    if (testError || !test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Get the submission — select only needed columns, not answers JSONB
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .select('id, test_id, status, started_at, student_email')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Test has already been submitted' },
        { status: 400 }
      );
    }

    // Server-side timer enforcement: reject submissions past the deadline
    // Allow 60 seconds grace period for network latency
    if (submission.started_at) {
      const startedAt = new Date(submission.started_at).getTime();
      const durationMs = test.duration_minutes * 60 * 1000;
      const gracePeriodMs = 60 * 1000;
      const now = Date.now();

      if (now > startedAt + durationMs + gracePeriodMs) {
        // Auto-grade with whatever answers were saved
        await supabaseAdmin
          .from('submissions')
          .update({
            answers,
            status: 'graded',
            auto_submitted: true,
            submitted_at: new Date().toISOString(),
          })
          .eq('id', submissionId);

        return NextResponse.json(
          { error: 'Time limit exceeded. Your answers have been saved.' },
          { status: 400 }
        );
      }
    }

    // Get questions for grading
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('test_id', test.id);

    if (questionsError) throw questionsError;

    // Grade MCQ questions
    let mcqScore = 0;
    const mcqQuestions = questions.filter((q: Question) => q.type === 'mcq');
    for (const question of mcqQuestions) {
      const studentAnswer = answers[question.id];
      if (studentAnswer === question.correct_answer) {
        mcqScore += question.points;
      }
    }

    // Grade coding questions
    const codingQuestions = questions.filter((q: Question) => q.type === 'coding');

    // Grade coding questions in parallel — each question's test cases already run in
    // parallel inside evaluateCode(), so this parallelizes across questions too
    const codingResults = await Promise.all(
      codingQuestions.map(async (question: Question) => {
        const studentCode = answers[question.id];
        if (!studentCode || !question.test_cases || question.test_cases.length === 0) return 0;
        try {
          const testCases = question.test_cases as TestCase[];
          const pointsPerTestCase = Math.floor(question.points / testCases.length);
          const result = await evaluateCode(studentCode, testCases, question.id, pointsPerTestCase);
          return result.score;
        } catch (error) {
          console.error('Failed to evaluate code for question:', question.id, error);
          // Partial credit for a genuine submission attempt
          return studentCode.trim().length > 50 ? Math.floor(question.points * 0.25) : 0;
        }
      })
    );
    const codingScore = codingResults.reduce((sum, s) => sum + s, 0);

    const totalScore = mcqScore + codingScore;

    // Update submission
    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({
        answers,
        mcq_score: mcqScore,
        coding_score: codingScore,
        total_score: totalScore,
        status: 'graded',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (updateError) throw updateError;

    return NextResponse.json({
      mcq_score: mcqScore,
      coding_score: codingScore,
      total_score: totalScore,
    });
  } catch (error) {
    console.error('Failed to submit test:', error);
    return NextResponse.json({ error: 'Failed to submit test' }, { status: 500 });
  }
}
