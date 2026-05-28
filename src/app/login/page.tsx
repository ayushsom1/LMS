'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = mode === 'register'
        ? { name: name.trim(), email: email.trim(), password }
        : { email: email.trim(), password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      const role = data.user?.role;
      const target = next || (role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
      router.push(target);
    } catch {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="hidden lg:flex relative flex-col justify-between p-10 bg-gradient-to-br from-primary/95 via-primary to-indigo-700 text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.18) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.12) 0, transparent 45%)',
        }} />
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        <div className="relative">
          <Logo size="lg" />
        </div>

        <div className="relative space-y-6 max-w-md">
          <blockquote className="text-2xl font-medium leading-snug tracking-tight">
            &ldquo;Testrainer cut our assessment overhead by 70%. Proctoring, grading,
            and analytics finally live in one place.&rdquo;
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-sm font-semibold">
              AS
            </div>
            <div>
              <div className="text-sm font-medium">Aditi Sharma</div>
              <div className="text-xs text-white/70">Head of Talent · Acme Corp</div>
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-6 text-xs text-white/70">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>SOC 2 ready</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>End-to-end encrypted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Real-time grading</span>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex flex-col">
        <header className="px-6 py-4 flex justify-between items-center border-b border-border/60">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back home</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="lg:hidden"><Logo size="sm" /></span>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm animate-in">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                {mode === 'register' ? 'Create your account' : 'Welcome back'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {mode === 'register'
                  ? 'Sign up to take assessments and track progress.'
                  : 'Sign in to access your tests and results.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <Field label="Full name">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 bg-card border border-border rounded-md text-sm text-foreground focus-ring transition-all"
                    placeholder="Jane Doe"
                    required
                  />
                </Field>
              )}
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className="w-full h-10 px-3 bg-card border border-border rounded-md text-sm text-foreground focus-ring transition-all"
                  placeholder="you@company.com"
                  required
                  autoFocus
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="w-full h-10 px-3 bg-card border border-border rounded-md text-sm text-foreground focus-ring transition-all"
                  placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
                  required
                  minLength={mode === 'register' ? 6 : undefined}
                />
              </Field>

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
                disabled={loading}
                className="w-full h-11 mt-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  mode === 'register' ? 'Create account' : 'Sign in'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {mode === 'register' ? 'Already have an account? Sign in' : "Don't have an account? Register"}
              </button>
            </div>

            <p className="mt-10 text-[10px] text-muted-foreground/70 text-center uppercase tracking-wider font-mono">
              Secured by Testrainer · testrainer.in
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginInner />
    </Suspense>
  );
}
