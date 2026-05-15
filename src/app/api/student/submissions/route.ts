import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireStudent, isResponse } from '@/lib/auth';

export async function GET() {
  try {
    const auth = await requireStudent();
    if (isResponse(auth)) return auth;

    const normalizedEmail = auth.email.toLowerCase().trim();

    // Run submissions and batch membership queries in parallel — no dependency between them
    const [submissionsResult, studentBatchesResult] = await Promise.all([
      supabaseAdmin
        .from('submissions')
        .select('id, test_id, student_name, student_email, mcq_score, coding_score, total_score, status, submitted_at, violation_count, auto_submitted, started_at')
        .eq('student_email', normalizedEmail)
        .order('submitted_at', { ascending: false }),
      supabaseAdmin
        .from('batch_students')
        .select('batch_id')
        .eq('email', normalizedEmail),
    ]);

    if (submissionsResult.error) throw submissionsResult.error;

    const submissions = submissionsResult.data || [];
    const batchIds = studentBatchesResult.data?.map((b) => b.batch_id) || [];

    // Find tests assigned to those batches (only if student belongs to any batches)
    let assignedTestIds: string[] = [];
    if (batchIds.length > 0) {
      const { data: testBatches } = await supabaseAdmin
        .from('test_batches')
        .select('test_id')
        .in('batch_id', batchIds);

      assignedTestIds = testBatches?.map((tb) => tb.test_id) || [];
    }

    // Combine test IDs from submissions + assigned tests (deduped)
    const submittedTestIds = submissions.map((s) => s.test_id);
    const allTestIds = [...new Set([...submittedTestIds, ...assignedTestIds])];

    if (allTestIds.length === 0) {
      return NextResponse.json({ submissions, tests: [] });
    }

    // Fetch test details and ALL questions for those tests in parallel — 2 queries total
    // instead of the previous N+1 pattern (1 query per test for questions)
    const [testsResult, questionsResult] = await Promise.all([
      supabaseAdmin
        .from('tests')
        .select('*')
        .in('id', allTestIds),
      supabaseAdmin
        .from('questions')
        .select('id, test_id, type, points')
        .in('test_id', allTestIds),
    ]);

    if (testsResult.error) throw testsResult.error;

    // Group questions by test_id in memory — avoids N queries
    const questionsByTest = (questionsResult.data || []).reduce<
      Record<string, { id: string; test_id: string; type: string; points: number }[]>
    >((acc, q) => {
      if (!acc[q.test_id]) acc[q.test_id] = [];
      acc[q.test_id].push(q);
      return acc;
    }, {});

    const testDetails = (testsResult.data || []).map((test) => {
      const questions = questionsByTest[test.id] || [];
      return {
        ...test,
        total_points: questions.reduce((sum, q) => sum + q.points, 0),
        mcq_count: questions.filter((q) => q.type === 'mcq').length,
        coding_count: questions.filter((q) => q.type === 'coding').length,
        question_count: questions.length,
      };
    });

    return NextResponse.json({ submissions, tests: testDetails });
  } catch (error) {
    console.error('Failed to fetch student submissions:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
