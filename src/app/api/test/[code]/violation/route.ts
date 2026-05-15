import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Violation } from '@/types';

const MAX_VIOLATIONS = 3; // Auto-submit after this many violations

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { submissionId, violation } = body;

    if (!submissionId || !violation) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get current submission — select only columns needed for violation logic
    // Avoid fetching large answers JSONB which is not needed here
    const { data: submission, error: getError } = await supabaseAdmin
      .from('submissions')
      .select('id, status, violations, violation_count')
      .eq('id', submissionId)
      .single();

    if (getError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Don't record violations for already submitted tests
    if (submission.status !== 'in_progress') {
      return NextResponse.json({ shouldAutoSubmit: false });
    }

    // Add violation
    const currentViolations: Violation[] = submission.violations || [];
    const newViolation: Violation = {
      type: violation.type,
      timestamp: new Date().toISOString(),
      message: violation.message,
    };
    currentViolations.push(newViolation);

    const newViolationCount = (submission.violation_count || 0) + 1;
    const shouldAutoSubmit = newViolationCount >= MAX_VIOLATIONS;

    // Update submission
    const { error: updateError } = await supabaseAdmin
      .from('submissions')
      .update({
        violations: currentViolations,
        violation_count: newViolationCount,
        ...(shouldAutoSubmit && {
          status: 'graded',
          auto_submitted: true,
          submitted_at: new Date().toISOString(),
        }),
      })
      .eq('id', submissionId);

    if (updateError) throw updateError;

    return NextResponse.json({
      violationCount: newViolationCount,
      maxViolations: MAX_VIOLATIONS,
      shouldAutoSubmit,
      message: shouldAutoSubmit
        ? 'Test auto-submitted due to multiple violations'
        : `Warning ${newViolationCount}/${MAX_VIOLATIONS}: ${violation.message}`,
    });
  } catch (error) {
    console.error('Failed to record violation:', error);
    return NextResponse.json({ error: 'Failed to record violation' }, { status: 500 });
  }
}
