'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<{ role: 'admin' | 'student' } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setSession(data?.user || null))
      .catch(() => setSession(null));
  }, []);

  const handleJoinTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      setError('Enter access code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/test/${accessCode.toUpperCase()}`);
      if (response.ok) {
        router.push(`/test/${accessCode.toUpperCase()}`);
      } else {
        setError('Invalid code');
      }
    } catch {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Subtle grid background */}
      <div className="fixed inset-0 grid-pattern pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 py-4 flex justify-between items-center border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary pulse-slow" />
          <span className="text-sm font-medium text-muted-foreground tracking-wide uppercase">LMS</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session?.role === 'student' && (
            <button
              onClick={() => router.push('/student/dashboard')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
            >
              my tests →
            </button>
          )}
          {session?.role === 'admin' && (
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
            >
              dashboard →
            </button>
          )}
          {!session && (
            <button
              onClick={() => router.push('/login')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
            >
              sign in →
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              Enter Test
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Input your 6-digit access code
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleJoinTest} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="••••••"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value.toUpperCase());
                  setError('');
                }}
                maxLength={6}
                className="w-full h-14 px-4 bg-card border border-border rounded-lg text-center text-2xl font-mono text-foreground tracking-[0.5em] placeholder:text-muted-foreground/30 placeholder:tracking-[0.3em] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
              {accessCode.length > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                  {accessCode.length}/6
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs text-destructive text-center font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || accessCode.length < 6}
              className="w-full h-11 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-medium rounded-lg transition-all duration-150 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Join Test</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Status indicator */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <span>System online</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 text-center">
        <p className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-wider">
          Test Management System
        </p>
      </footer>
    </div>
  );
}
