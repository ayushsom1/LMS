import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

export async function POST() {
  await clearSession();
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ success: true });
}
