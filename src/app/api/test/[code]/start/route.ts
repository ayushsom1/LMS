import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { student_name, student_email } = body;

    if (!student_name || !student_email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
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

    if (!test.is_active) {
      return NextResponse.json(
        { error: 'Test is no longer accepting submissions' },
        { status: 400 }
      );
    }

    // Create a new submission
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .insert({
        test_id: test.id,
        student_name,
        student_email,
        status: 'in_progress',
        answers: {},
        mcq_score: 0,
        coding_score: 0,
        total_score: 0,
      })
      .select()
      .single();

    if (submissionError) throw submissionError;

    return NextResponse.json({ submissionId: submission.id }, { status: 201 });
  } catch (error) {
    console.error('Failed to start test:', error);
    return NextResponse.json({ error: 'Failed to start test' }, { status: 500 });
  }
}
