'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Test } from '@/types';
import { formatDuration } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';

export default function TestEntryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email');

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState(emailFromUrl || '');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [autoStarting, setAutoStarting] = useState(false);

  const isEmailPreFilled = !!emailFromUrl || loggedIn;

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not logged in');
      })
      .then((data) => {
        if (data.user?.role !== 'student') throw new Error('Not a student');
        setStudentName(data.user.name);
        setStudentEmail(data.user.email);
        setLoggedIn(true);
      })
      .catch(() => {
        if (emailFromUrl) setStudentEmail(emailFromUrl);
      });
  }, [emailFromUrl]);

  useEffect(() => {
    if (emailFromUrl && !loggedIn) setStudentEmail(emailFromUrl);
  }, [emailFromUrl, loggedIn]);

  const fetchTest = useCallback(async () => {
    try {
      const response = await fetch(`/api/test/${code}`);
      if (response.ok) {
        const data = await response.json();
        setTest(data.test || data);
      } else {
        setError('Test not found');
      }
    } catch {
      setError('Failed to load test');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchTest();
  }, [fetchTest]);

  const startTest = useCallback(async (name: string, email: string) => {
    setStarting(true);
    setError('');
    setErrorCode('');

    try {
      const response = await fetch(`/api/test/${code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_name: name, student_email: email }),
      });

      if (response.ok) {
        const data = await response.json();
        sessionStorage.setItem(`test_${code}_submission`, data.submissionId);
        sessionStorage.setItem(`test_${code}_name`, name);
        const serverStart = data.started_at
          ? new Date(data.started_at).getTime()
          : Date.now();
        sessionStorage.setItem(`test_${code}_start`, serverStart.toString());
        if (data.duration_minutes) {
          sessionStorage.setItem(`test_${code}_duration`, data.duration_minutes.toString());
        }
        router.push(`/test/${code}/take`);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to start');
        setErrorCode(data.code || '');
        setAutoStarting(false);
      }
    } catch {
      setError('Connection failed');
      setAutoStarting(false);
    } finally {
      setStarting(false);
    }
  }, [code, router]);

  useEffect(() => {
    if (loggedIn && test && test.is_active && !autoStarting && !starting && !error) {
      setAutoStarting(true);
      startTest(studentName, studentEmail);
    }
  }, [loggedIn, test, autoStarting, starting, error, studentName, studentEmail, startTest]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentEmail.trim()) {
      setError('Please fill in all fields');
      return;
    }
    startTest(studentName.trim(), studentEmail.trim());
  };

  if (loading || (loggedIn && !error && !autoStarting)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (autoStarting && !error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 gap-4">
        <Logo size="md" />
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin mt-4" />
        <p className="text-sm text-muted-foreground">Preparing your test environment…</p>
      </div>
    );
  }

  if (!test) {
    return (
      <PageShell>
        <div className="surface-elevated p-8 max-w-sm w-full text-center animate-in">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20 mb-4">
            <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-base font-semibold text-foreground mb-1">Test not found</h1>
          <p className="text-sm text-muted-foreground mb-5">{error || 'Please double-check the access code with your instructor.'}</p>
          <button
            onClick={() => router.push('/')}
            className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors"
          >
            Back to home
          </button>
        </div>
      </PageShell>
    );
  }

  if (!test.is_active) {
    return (
      <PageShell>
        <div className="surface-elevated p-8 max-w-sm w-full text-center animate-in">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-base font-semibold text-foreground mb-1">Test closed</h1>
          <p className="text-sm text-muted-foreground mb-5">This assessment is no longer accepting submissions.</p>
          <button
            onClick={() => router.push('/')}
            className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors"
          >
            Back to home
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="w-full max-w-md animate-in">
        <div className="surface-elevated p-7">
          {/* Test summary */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                Access code · <span className="font-mono text-primary">{code}</span>
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">{test.title}</h1>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-mono">{formatDuration(test.duration_minutes)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="status-dot text-emerald-500" />
                  <span>Live</span>
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>

          <form onSubmit={handleStart} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Full name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => !loggedIn && setStudentName(e.target.value)}
                readOnly={loggedIn}
                className={`w-full h-10 px-3 border rounded-md text-sm text-foreground placeholder:text-muted-foreground transition-all ${
                  loggedIn
                    ? 'bg-emerald-500/5 border-emerald-500/30 cursor-not-allowed'
                    : 'bg-card border-border focus-ring'
                }`}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-foreground mb-1.5">
                <span>Email</span>
                {isEmailPreFilled && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 normal-case font-mono">verified ✓</span>
                )}
              </label>
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => !isEmailPreFilled && setStudentEmail(e.target.value)}
                readOnly={isEmailPreFilled}
                className={`w-full h-10 px-3 border rounded-md text-sm text-foreground placeholder:text-muted-foreground transition-all ${
                  isEmailPreFilled
                    ? 'bg-emerald-500/5 border-emerald-500/30 cursor-not-allowed'
                    : 'bg-card border-border focus-ring'
                }`}
                placeholder="you@company.com"
                required
              />
            </div>

            {/* Instructions */}
            <div className="rounded-md bg-secondary/40 border border-border/60 p-3 space-y-1.5 mt-2">
              <div className="flex items-center gap-2 text-xs">
                <CheckBullet />
                <span className="text-muted-foreground">Timer starts immediately on submit</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckBullet />
                <span className="text-muted-foreground">Cannot be paused once started</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckBullet />
                <span className="text-muted-foreground">Results delivered to your email</span>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20">
                <svg className="w-3.5 h-3.5 mt-0.5 text-destructive flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs text-destructive font-medium">{error}</p>
                  {errorCode === 'NOT_REGISTERED' && (
                    <button
                      type="button"
                      onClick={() => router.push(`/login?mode=register&next=${encodeURIComponent(`/test/${code}`)}`)}
                      className="text-xs text-primary hover:text-primary/80 underline mt-1"
                    >
                      Register or sign in →
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={starting}
              className="w-full h-11 mt-1 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:bg-muted disabled:text-muted-foreground text-white dark:text-emerald-950 font-medium rounded-md transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20"
            >
              {starting ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Start test
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-[10px] text-muted-foreground/70 text-center uppercase tracking-wider font-mono">
          Powered by Testrainer · testrainer.in
        </p>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-60" />
      <div className="fixed inset-0 spotlight pointer-events-none" />
      <header className="relative z-10 px-6 py-4 border-b border-border/60 flex justify-between items-center backdrop-blur-sm bg-background/60">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm">Back</span>
        </button>
        <Logo size="sm" />
        <ThemeToggle />
      </header>
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        {children}
      </main>
    </div>
  );
}

function CheckBullet() {
  return (
    <svg className="w-3.5 h-3.5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
