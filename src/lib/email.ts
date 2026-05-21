import { Resend } from 'resend';

// Lazy initialization to avoid build errors when API key is not set
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

interface SendResultsEmailParams {
  to: string;
  studentName: string;
  testTitle: string;
  mcqScore: number;
  codingScore: number;
  totalScore: number;
  maxScore: number;
}

export async function sendResultsEmail({
  to,
  studentName,
  testTitle,
  mcqScore,
  codingScore,
  totalScore,
  maxScore,
}: SendResultsEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    const { error } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || 'LMS Test System <noreply@testrainer.in>',
      to: [to],
      subject: `Your Test Results: ${testTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Test Results</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Test Results</h1>
            </div>

            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef; border-top: none;">
              <p style="font-size: 18px; margin-bottom: 20px;">Hello <strong>${studentName}</strong>,</p>

              <p>Your results for <strong>${testTitle}</strong> are now available:</p>

              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;">MCQ Score</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${mcqScore} points</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;">Coding Score</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${codingScore} points</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-size: 18px;"><strong>Total Score</strong></td>
                    <td style="padding: 10px 0; text-align: right; font-size: 18px;"><strong>${totalScore} / ${maxScore} (${percentage}%)</strong></td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin-top: 30px; padding: 20px; background: ${percentage >= 70 ? '#d4edda' : percentage >= 50 ? '#fff3cd' : '#f8d7da'}; border-radius: 8px;">
                <p style="margin: 0; font-size: 16px; color: ${percentage >= 70 ? '#155724' : percentage >= 50 ? '#856404' : '#721c24'};">
                  ${percentage >= 70 ? '🎉 Excellent work!' : percentage >= 50 ? '👍 Good effort!' : '📚 Keep practicing!'}
                </p>
              </div>

              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Thank you for taking the test. If you have any questions, please contact your instructor.
              </p>
            </div>

            <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
              This is an automated email from the LMS Test System.
            </p>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
