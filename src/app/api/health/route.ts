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

  // Only the database is required for the app to be considered healthy.
  // code_execution is informational — Piston/Judge0 outage shouldn't take down the box.
  const healthy = checks.database;

  return NextResponse.json(
    { status: healthy ? 'healthy' : 'degraded', checks },
    { status: healthy ? 200 : 503 }
  );
}
