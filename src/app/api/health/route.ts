import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { isExecutionEngineAvailable } from '@/lib/piston';

export async function GET() {
  const checks: Record<string, boolean> = {};

  // Check database
  try {
    const { error } = await supabaseAdmin.from('tests').select('id').limit(1);
    checks.database = !error;
  } catch {
    checks.database = false;
  }

  // Check code execution engine
  try {
    checks.code_execution = await isExecutionEngineAvailable();
  } catch {
    checks.code_execution = false;
  }

  const healthy = Object.values(checks).every(Boolean);

  return NextResponse.json(
    { status: healthy ? 'healthy' : 'degraded', checks },
    { status: healthy ? 200 : 503 }
  );
}
