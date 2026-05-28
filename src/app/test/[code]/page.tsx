'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Test } from '@/types';
import { formatDuration, cn } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  XCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';

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

  // Auto-start test if logged in and test is loaded
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

  // Auto-starting for logged-in users
  if (autoStarting && !error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Starting test...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 animate-in">
        <div className="w-12 h-12 rounded-full bg-destructive/10 ring-1 ring-destructive/20 flex items-center justify-center mb-4">
          <XCircle className="w-6 h-6 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground mb-4">{error || 'Test not found'}</p>
        <Button variant="link" size="sm" onClick={() => router.push('/')}>
          <ArrowLeft className="size-3.5" /> Back to home
        </Button>
      </div>
    );
  }

  if (!test.is_active) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 animate-in">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
        </div>
        <p className="text-sm text-muted-foreground mb-4">This test is no longer accepting submissions</p>
        <Button variant="link" size="sm" onClick={() => router.push('/')}>
          <ArrowLeft className="size-3.5" /> Back to home
        </Button>
      </div>
    );
  }

  // Show form for non-logged-in users (or logged-in users who hit an error like "already taken")
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 grid-pattern pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 py-4 border-b border-border/50 flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/')}
          className="text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="text-xs font-mono">back</span>
        </Button>
        <ThemeToggle />
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Test info */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border mb-4">
              <Clock className="size-3 text-emerald-500 dark:text-emerald-400" />
              <span className="text-xs text-muted-foreground font-mono">{formatDuration(test.duration_minutes)}</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{test.title}</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleStart} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="studentName" className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Full Name
              </Label>
              <Input
                id="studentName"
                type="text"
                value={studentName}
                onChange={(e) => !loggedIn && setStudentName(e.target.value)}
                readOnly={loggedIn}
                className={cn(loggedIn && 'bg-secondary/50 border-emerald-500/30 cursor-not-allowed')}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studentEmail" className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Email
                {isEmailPreFilled && (
                  <span className="ml-1 text-emerald-600 dark:text-emerald-400 normal-case font-normal">(verified)</span>
                )}
              </Label>
              <Input
                id="studentEmail"
                type="email"
                value={studentEmail}
                onChange={(e) => !isEmailPreFilled && setStudentEmail(e.target.value)}
                readOnly={isEmailPreFilled}
                className={cn(isEmailPreFilled && 'bg-secondary/50 border-emerald-500/30 cursor-not-allowed')}
                placeholder="john@example.com"
                required
              />
            </div>

            {/* Instructions */}
            <div className="p-3 bg-secondary/50 border border-border/50 rounded-lg text-xs text-muted-foreground space-y-1">
              <p>• Timer starts immediately</p>
              <p>• Cannot pause once started</p>
              <p>• Results sent to email</p>
            </div>

            {error && (
              <div className="space-y-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2">
                <p className="text-xs text-destructive font-medium">{error}</p>
                {errorCode === 'NOT_REGISTERED' && (
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    className="px-0 h-auto"
                    onClick={() => router.push(`/login?mode=register&next=${encodeURIComponent(`/test/${code}`)}`)}
                  >
                    Register or sign in <ArrowRight className="size-3" />
                  </Button>
                )}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={starting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-zinc-900"
            >
              {starting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>Start Test<ArrowRight className="size-4" /></>
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
