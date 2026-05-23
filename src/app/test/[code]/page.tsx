'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Test, TestAccessInfo } from '@/types';
import { formatDuration } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return days > 0 ? `${days}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function AccessGate({ access, now, onBack }: { access: TestAccessInfo; now: number; onBack: () => void }) {
  const isScheduled = access.status === 'not_started' && access.starts_at;
  const remaining = isScheduled ? new Date(access.starts_at!).getTime() - now : 0;
  const headings: Record<TestAccessInfo['status'], string> = {
    open: 'Test is open',
    not_started: 'Test starts soon',
    ended: 'Test closed',
    inactive: 'Test unavailable',
  };
  const accentColor = access.status === 'ended' || access.status === 'inactive'
    ? 'text-muted-foreground bg-secondary'
    : 'text-amber-600 dark:text-amber-400 bg-amber-500/10';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className={`w-12 h-12 rounded-lg ${accentColor} flex items-center justify-center mb-4`}>
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-lg font-semibold text-foreground mb-1">{headings[access.status]}</h1>
      <p className="text-sm text-muted-foreground mb-4">{access.message}</p>
      {isScheduled && (
        <div className="mb-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Starts in</p>
          <p className="text-3xl font-mono text-foreground tabular-nums">{formatCountdown(remaining)}</p>
          <p className="text-[11px] text-muted-foreground mt-2">
            {new Date(access.starts_at!).toLocaleString()}
          </p>
        </div>
      )}
      {access.status === 'ended' && access.ends_at && (
        <p className="text-[11px] text-muted-foreground mb-4">
          Closed at {new Date(access.ends_at).toLocaleString()}
        </p>
      )}
      <button onClick={onBack} className="text-xs text-primary hover:text-primary/80">
        ← Back to home
      </button>
    </div>
  );
}

export default function TestEntryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email');

  const [test, setTest] = useState<Test | null>(null);
  const [accessInfo, setAccessInfo] = useState<TestAccessInfo | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState(emailFromUrl || '');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [autoStarting, setAutoStarting] = useState(false);

  // Pre-fill email from URL parameter
  const isEmailPreFilled = !!emailFromUrl || loggedIn;

  // Check if student is logged in
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
        // Not logged in — use URL param if available
        if (emailFromUrl) {
          setStudentEmail(emailFromUrl);
        }
      });
  }, [emailFromUrl]);

  // Update email if URL param changes
  useEffect(() => {
    if (emailFromUrl && !loggedIn) {
      setStudentEmail(emailFromUrl);
    }
  }, [emailFromUrl, loggedIn]);

  const fetchTest = useCallback(async () => {
    try {
      const response = await fetch(`/api/test/${code}`);
      const data = await response.json().catch(() => null);
      if (response.ok && data) {
        setTest(data.test || data);
        setAccessInfo(null);
      } else if (response.status === 403 && data?.access) {
        setAccessInfo(data.access as TestAccessInfo);
      } else {
        setError(data?.error || 'Test not found');
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

  // Auto-start test if logged in and test is loaded and open
  useEffect(() => {
    if (loggedIn && test && test.is_active && !accessInfo && !autoStarting && !starting && !error) {
      setAutoStarting(true);
      startTest(studentName, studentEmail);
    }
  }, [loggedIn, test, accessInfo, autoStarting, starting, error, studentName, studentEmail, startTest]);

  // Ticker for countdown / auto-refresh when start time arrives
  useEffect(() => {
    if (!accessInfo) return;
    const interval = setInterval(() => {
      setNow(Date.now());
      if (accessInfo.status === 'not_started' && accessInfo.starts_at) {
        if (Date.now() >= new Date(accessInfo.starts_at).getTime()) {
          fetchTest();
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [accessInfo, fetchTest]);

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

  // Auto-starting for logged-in users
  if (autoStarting && !error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Starting test...</p>
      </div>
    );
  }

  if (accessInfo) {
    return <AccessGate access={accessInfo} now={now} onBack={() => router.push('/')} />;
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{error || 'Test not found'}</p>
        <button
          onClick={() => router.push('/')}
          className="text-xs text-primary hover:text-primary/80"
        >
          ← Back to home
        </button>
      </div>
    );
  }

  if (!test.is_active) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground mb-4">This test is no longer accepting submissions</p>
        <button
          onClick={() => router.push('/')}
          className="text-xs text-primary hover:text-primary/80"
        >
          ← Back to home
        </button>
      </div>
    );
  }

  // Show form for non-logged-in users (or logged-in users who hit an error like "already taken")
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 grid-pattern pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 py-4 border-b border-border/50 flex justify-between items-center">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-xs font-mono">back</span>
        </button>
        <ThemeToggle />
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Test info */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span className="text-xs text-muted-foreground font-mono">{formatDuration(test.duration_minutes)}</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground">{test.title}</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleStart} className="space-y-3">
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">
                Full Name
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => !loggedIn && setStudentName(e.target.value)}
                readOnly={loggedIn}
                className={`w-full h-10 px-3 border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${
                  loggedIn
                    ? 'bg-secondary/50 border-emerald-500/30 cursor-not-allowed'
                    : 'bg-card border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20'
                }`}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">
                Email
                {isEmailPreFilled && (
                  <span className="ml-2 text-emerald-600 dark:text-emerald-400 normal-case">(verified)</span>
                )}
              </label>
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => !isEmailPreFilled && setStudentEmail(e.target.value)}
                readOnly={isEmailPreFilled}
                className={`w-full h-10 px-3 border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all ${
                  isEmailPreFilled
                    ? 'bg-secondary/50 border-emerald-500/30 cursor-not-allowed'
                    : 'bg-card border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20'
                }`}
                placeholder="john@example.com"
                required
              />
            </div>

            {/* Instructions */}
            <div className="p-3 bg-secondary/50 border border-border/50 rounded text-xs text-muted-foreground space-y-1">
              <p>• Timer starts immediately</p>
              <p>• Cannot pause once started</p>
              <p>• Results sent to email</p>
            </div>

            {error && (
              <div className="space-y-2">
                <p className="text-xs text-destructive font-medium">{error}</p>
                {errorCode === 'NOT_REGISTERED' && (
                  <button
                    type="button"
                    onClick={() => router.push(`/login?mode=register&next=${encodeURIComponent(`/test/${code}`)}`)}
                    className="text-xs text-primary hover:text-primary/80 underline"
                  >
                    Register or sign in →
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={starting}
              className="w-full h-11 mt-2 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:bg-muted disabled:text-muted-foreground text-white dark:text-zinc-900 font-medium rounded transition-all flex items-center justify-center gap-2"
            >
              {starting ? (
                <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Start Test
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
