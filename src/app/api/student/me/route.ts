// Compat shim for old client bundles that still call /api/student/me.
// Remove once no users have stale tabs open. The middleware ensures only
// students can reach this; auth is handled there.
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  const user = await getSession();
  if (!user || user.role !== 'student') {
    return NextResponse.json({ student: null }, { status: 401 });
  }
  return NextResponse.json({ student: user, user });
}
