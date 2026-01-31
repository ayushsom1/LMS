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

    // Normalize email
    const normalizedEmail = student_email.toLowerCase().trim();

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

    // Check if this email has already taken this test
    const { data: existingSubmission } = await supabaseAdmin
      .from('submissions')
      .select('id, status')
      .eq('test_id', test.id)
      .eq('student_email', normalizedEmail)
      .single();

    if (existingSubmission) {
      if (existingSubmission.status === 'in_progress') {
        // Allow resuming an in-progress test
        return NextResponse.json({ submissionId: existingSubmission.id }, { status: 200 });
      }
      // Test already completed
      return NextResponse.json(
        { error: 'You have already taken this test. Each email can only be used once.' },
        { status: 400 }
      );
    }

    // Create a new submission
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .insert({
        test_id: test.id,
        student_name,
        student_email: normalizedEmail,
        status: 'in_progress',
        answers: {},
        mcq_score: 0,
        coding_score: 0,
        total_score: 0,
        violation_count: 0,
        violations: [],
        auto_submitted: false,
      })
      .select()
      .single();

    if (submissionError) {
      // Handle unique constraint violation
      if (submissionError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already taken this test. Each email can only be used once.' },
          { status: 400 }
        );
      }
      throw submissionError;
    }

    // Update student name in batch_students table if they exist there
    // This allows admin to see the name in batch management after student takes test
    await supabaseAdmin
      .from('batch_students')
      .update({ name: student_name })
      .eq('email', normalizedEmail);

    return NextResponse.json({ submissionId: submission.id }, { status: 201 });
  } catch (error) {
    console.error('Failed to start test:', error);
    return NextResponse.json({ error: 'Failed to start test' }, { status: 500 });
  }
}
