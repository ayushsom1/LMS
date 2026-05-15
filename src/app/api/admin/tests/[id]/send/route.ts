import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Resend } from 'resend';

let resendInstance: Resend | null = null;
function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

// POST - Send test to batches
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: test_id } = await params;
    const body = await request.json();
    const { batch_ids } = body; // Array of batch IDs

    if (!batch_ids || !Array.isArray(batch_ids) || batch_ids.length === 0) {
      return NextResponse.json({ error: 'Batch IDs are required' }, { status: 400 });
    }

    // Get test details
    const { data: test, error: testError } = await supabaseAdmin
      .from('tests')
      .select('*')
      .eq('id', test_id)
      .single();

    if (testError || !test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Link batches to test
    const testBatches = batch_ids.map((batch_id: string) => ({
      test_id,
      batch_id,
    }));

    await supabaseAdmin
      .from('test_batches')
      .upsert(testBatches, { onConflict: 'test_id,batch_id', ignoreDuplicates: true });

    // Get all student emails from selected batches
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('batch_students')
      .select('email, name')
      .in('batch_id', batch_ids);

    if (studentsError) throw studentsError;

    if (!students || students.length === 0) {
      return NextResponse.json({ error: 'No students in selected batches' }, { status: 400 });
    }

    // Get unique emails
    const uniqueEmails = [...new Set(students.map((s: { email: string }) => s.email))];
    const baseUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/test/${test.access_code}`;

    // Send emails in parallel batches of 10
    let sentCount = 0;
    let failedCount = 0;
    const BATCH_SIZE = 10;

    for (let i = 0; i < uniqueEmails.length; i += BATCH_SIZE) {
      const batch = uniqueEmails.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (email) => {
          const personalizedUrl = `${baseUrl}?email=${encodeURIComponent(email)}`;

          await getResend().emails.send({
            from: 'Test Platform <onboarding@resend.dev>',
            to: email,
            subject: `Test Invitation: ${test.title}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>You've been invited to take a test</h2>
                <p><strong>Test:</strong> ${test.title}</p>
                <p><strong>Duration:</strong> ${test.duration_minutes} minutes</p>
                <p style="margin: 20px 0;">
                  <a href="${personalizedUrl}" style="background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Start Test
                  </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                  This link is personalized for ${email}
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #999; font-size: 12px;">
                  Important: You can only take this test once. Make sure you have a stable internet connection before starting.
                </p>
              </div>
            `,
          });
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          sentCount++;
        } else {
          console.error('Failed to send email:', result.reason);
          failedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total: uniqueEmails.length,
    });
  } catch (error) {
    console.error('Failed to send test:', error);
    return NextResponse.json({ error: 'Failed to send test' }, { status: 500 });
  }
}

// GET - Get batches linked to this test
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: test_id } = await params;

    const { data, error } = await supabaseAdmin
      .from('test_batches')
      .select(`
        *,
        batch:batches(*)
      `)
      .eq('test_id', test_id);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch test batches:', error);
    return NextResponse.json({ error: 'Failed to fetch test batches' }, { status: 500 });
  }
}
