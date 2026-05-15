import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export type UserRole = 'admin' | 'student';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

const COOKIE_NAME = 'session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function setSession(user: SessionUser) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_NAME);
    if (!raw) return null;
    const parsed = JSON.parse(raw.value) as SessionUser;
    if (!parsed?.id || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<SessionUser | NextResponse> {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}

export async function requireStudent(): Promise<SessionUser | NextResponse> {
  const session = await getSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}

export function isResponse(r: SessionUser | NextResponse): r is NextResponse {
  return r instanceof NextResponse;
}
