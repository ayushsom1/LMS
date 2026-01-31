import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { evaluateCode } from '@/lib/judge0';
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

    // Get the submission
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .select('*')
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
    let codingScore = 0;
    const codingQuestions = questions.filter((q: Question) => q.type === 'coding');

    // Try to use Judge0 for code evaluation
    for (const question of codingQuestions) {
      const studentCode = answers[question.id];
      if (studentCode && question.test_cases && question.test_cases.length > 0) {
        try {
          const testCases = question.test_cases as TestCase[];
          const pointsPerTestCase = Math.floor(question.points / testCases.length);
          const result = await evaluateCode(
            studentCode,
            testCases,
            question.id,
            pointsPerTestCase
          );
          codingScore += result.score;
        } catch (error) {
          console.error('Failed to evaluate code for question:', question.id, error);
          // If Judge0 fails, give partial credit for submission attempt
          if (studentCode.trim().length > 50) {
            codingScore += Math.floor(question.points * 0.25);
          }
        }
      }
    }

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
