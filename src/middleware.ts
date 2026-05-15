import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type Role = 'admin' | 'student';

function readSession(request: NextRequest): { id: string; role: Role } | null {
  const raw = request.cookies.get('session');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw.value);
    if (!parsed?.id || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest) {
  const url = new URL('/login', request.url);
  url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = readSession(request);

  // API guards — return JSON, not redirects
  if (pathname.startsWith('/api/admin')) {
    if (!session) return unauthorized();
    if (session.role !== 'admin') return forbidden();
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/student')) {
    if (!session) return unauthorized();
    if (session.role !== 'student') return forbidden();
    return NextResponse.next();
  }

  // Page guards — redirect to /login
  if (pathname.startsWith('/admin')) {
    if (!session) return redirectToLogin(request);
    if (session.role !== 'admin') {
      return NextResponse.redirect(new URL('/student/dashboard', request.url));
    }
  }

  if (pathname.startsWith('/student')) {
    if (!session) return redirectToLogin(request);
    if (session.role !== 'student') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  // Bounce logged-in users away from /login
  if (pathname === '/login' && session) {
    const dest = session.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/student/:path*', '/login', '/api/admin/:path*', '/api/student/:path*'],
};
