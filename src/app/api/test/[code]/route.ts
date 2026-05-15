import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { cacheGet, cacheSet } from '@/lib/redis';

// Cache TTL: 5 minutes — test content doesn't change during an active exam
const CACHE_TTL = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const upperCode = code.toUpperCase();
    const cacheKey = `test:${upperCode}`;

    // Serve from cache if available — critical for 2000 students hitting same test at start
    const cached = await cacheGet<{ test: unknown; questions: unknown[] }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch test and questions in parallel
    const [testResult, questionsResult] = await Promise.all([
      supabaseAdmin
        .from('tests')
        .select('*')
        .eq('access_code', upperCode)
        .single(),
      supabaseAdmin
        .from('questions')
        .select('id, test_id, type, title, description, options, test_cases, points, order_index')
        .order('order_index', { ascending: true }),
    ]);

    const { data: test, error: testError } = testResult;

    if (testError || !test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (questionsResult.error) {
      console.error('Failed to fetch questions:', questionsResult.error);
    }

    // Filter to only this test's questions (we delayed the filter to allow parallel fetch)
    const questions = (questionsResult.data || []).filter((q) => q.test_id === test.id);

    // Strip correct_answer and hidden test case inputs before sending to student
    const sanitizedQuestions = questions.map((q) => ({
      ...q,
      correct_answer: undefined,
      test_cases: q.test_cases?.map((tc: { id: string; input: string; expected_output: string; is_hidden: boolean }) =>
        tc.is_hidden ? { ...tc, input: undefined, expected_output: undefined } : tc
      ),
    }));

    const payload = { test, questions: sanitizedQuestions };

    // Cache for 5 minutes — all 2000 students share this single cached entry
    await cacheSet(cacheKey, payload, CACHE_TTL);

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to fetch test:', error);
    return NextResponse.json({ error: 'Failed to fetch test' }, { status: 500 });
  }
}
