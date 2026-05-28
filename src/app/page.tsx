'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';

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
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background layers */}
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-60" />
      <div className="fixed inset-0 spotlight pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 lg:px-10 py-4 flex justify-between items-center border-b border-border/60 backdrop-blur-sm bg-background/60">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <a
            href="#features"
            className="hidden md:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </a>
          <a
            href="#contact"
            className="hidden md:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Contact
          </a>
          <div className="hidden md:block w-px h-5 bg-border" />
          <ThemeToggle />
          {session?.role === 'student' && (
            <button
              onClick={() => router.push('/student/dashboard')}
              className="h-8 px-3 text-xs font-medium rounded-md border border-border bg-card hover:bg-secondary transition-colors"
            >
              My Tests
            </button>
          )}
          {session?.role === 'admin' && (
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="h-8 px-3 text-xs font-medium rounded-md border border-border bg-card hover:bg-secondary transition-colors"
            >
              Dashboard
            </button>
          )}
          {!session && (
            <button
              onClick={() => router.push('/login')}
              className="h-8 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — pitch */}
          <div className="animate-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/60 backdrop-blur-sm mb-6">
              <span className="status-dot text-emerald-500" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Trusted assessment platform
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold text-foreground tracking-tight leading-[1.1]">
              Conduct rigorous,<br />
              <span className="text-gradient-brand">secure assessments.</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
              Run coding tests, MCQs, and timed evaluations with real-time proctoring,
              detailed analytics, and instant grading.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              <Stat label="Tests run" value="12K+" />
              <Stat label="Avg. uptime" value="99.9%" />
              <Stat label="Languages" value="14" />
            </div>
          </div>

          {/* Right — access code card */}
          <div className="animate-in" style={{ animationDelay: '80ms' }}>
            <div className="surface-elevated p-7 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground tracking-tight">
                    Join a test
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Enter the 6-digit access code from your instructor.
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>

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
                    className="w-full h-14 px-4 bg-background border border-border rounded-lg text-center text-2xl font-mono font-medium text-foreground tracking-[0.5em] placeholder:text-muted-foreground/30 placeholder:tracking-[0.3em] focus-ring transition-all"
                  />
                  {accessCode.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono tabular-nums">
                      {accessCode.length}/6
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20">
                    <svg className="w-3.5 h-3.5 text-destructive flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-destructive font-medium">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || accessCode.length < 6}
                  className="w-full h-11 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground text-sm font-medium rounded-lg transition-all duration-150 flex items-center justify-center gap-2 shadow-sm shadow-primary/20 disabled:shadow-none"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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

              <div className="mt-6 pt-6 border-t border-border/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="status-dot text-emerald-500" />
                  <span>All systems operational</span>
                </div>
                <button
                  onClick={() => router.push('/login')}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Have an account? Sign in →
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 lg:px-10 py-5 border-t border-border/60 flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Logo size="sm" showWordmark />
          <span className="ml-2">© {new Date().getFullYear()} Testrainer. All rights reserved.</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70 font-mono uppercase tracking-wider">
          v1.0 · testrainer.in
        </p>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-border pl-3">
      <div className="text-xl font-semibold text-foreground tabular-nums tracking-tight">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
