import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await params; // consume params
    const body = await request.json();
    const { submissionId, answers } = body;

    if (!submissionId || !answers) {
      return NextResponse.json(
        { error: 'Submission ID and answers are required' },
        { status: 400 }
      );
    }

    // Only save if submission is still in progress
    const { error } = await supabaseAdmin
      .from('submissions')
      .update({ answers })
      .eq('id', submissionId)
      .eq('status', 'in_progress');

    if (error) throw error;

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error('Failed to auto-save:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
