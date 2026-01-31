'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Test } from '@/types';
import { formatDuration } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';

export default function TestEntryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

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

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentEmail.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setStarting(true);
    setError('');

    try {
      const response = await fetch(`/api/test/${code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_name: studentName, student_email: studentEmail }),
      });

      if (response.ok) {
        const { submissionId } = await response.json();
        sessionStorage.setItem(`test_${code}_submission`, submissionId);
        sessionStorage.setItem(`test_${code}_name`, studentName);
        sessionStorage.setItem(`test_${code}_start`, Date.now().toString());
        router.push(`/test/${code}/take`);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to start');
      }
    } catch {
      setError('Connection failed');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
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
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full h-10 px-3 bg-card border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">
                Email
              </label>
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                className="w-full h-10 px-3 bg-card border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
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
              <p className="text-xs text-destructive font-medium">{error}</p>
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
