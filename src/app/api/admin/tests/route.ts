import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { generateAccessCode } from '@/lib/utils';

export async function GET() {
  try {
    // Single query with embedded counts — eliminates the previous N+1 pattern
    // where each test triggered 2 extra DB round-trips (questions + submissions count)
    const { data: tests, error } = await supabaseAdmin
      .from('tests')
      .select(`
        *,
        question_count:questions(count),
        submission_count:submissions(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Flatten the nested count arrays returned by Supabase
    const testsWithStats = tests.map((test) => ({
      ...test,
      question_count: (test.question_count as unknown as { count: number }[])?.[0]?.count ?? 0,
      submission_count: (test.submission_count as unknown as { count: number }[])?.[0]?.count ?? 0,
    }));

    return NextResponse.json(testsWithStats);
  } catch (error) {
    console.error('Failed to fetch tests:', error);
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, duration_minutes, is_active, starts_at, ends_at } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (starts_at && ends_at && new Date(ends_at) <= new Date(starts_at)) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
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
        starts_at: starts_at || null,
        ends_at: ends_at || null,
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
