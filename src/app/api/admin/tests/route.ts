import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { generateAccessCode } from '@/lib/utils';

export async function GET() {
  try {
    const { data: tests, error } = await supabaseAdmin
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get question and submission counts for each test
    const testsWithStats = await Promise.all(
      tests.map(async (test) => {
        const [questionsResult, submissionsResult] = await Promise.all([
          supabaseAdmin
            .from('questions')
            .select('id', { count: 'exact', head: true })
            .eq('test_id', test.id),
          supabaseAdmin
            .from('submissions')
            .select('id', { count: 'exact', head: true })
            .eq('test_id', test.id),
        ]);

        return {
          ...test,
          question_count: questionsResult.count || 0,
          submission_count: submissionsResult.count || 0,
        };
      })
    );

    return NextResponse.json(testsWithStats);
  } catch (error) {
    console.error('Failed to fetch tests:', error);
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, duration_minutes, is_active } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Generate unique access code
    let accessCode = generateAccessCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabaseAdmin
        .from('tests')
        .select('id')
        .eq('access_code', accessCode)
        .single();

      if (!existing) break;
      accessCode = generateAccessCode();
      attempts++;
    }

    const { data: test, error } = await supabaseAdmin
      .from('tests')
      .insert({
        title,
        duration_minutes: duration_minutes || 60,
        access_code: accessCode,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    console.error('Failed to create test:', error);
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 });
  }
}
