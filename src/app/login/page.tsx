'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Lock, Zap, AlertCircle, Loader2 } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 grid-pattern pointer-events-none" />

      <header className="relative z-10 px-6 py-4 flex justify-between items-center border-b border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/')}
          className="text-muted-foreground hover:text-foreground gap-2 px-2"
        >
          <ArrowLeft className="size-4" />
          <span className="text-xs font-mono">home</span>
        </Button>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {mode === 'register' ? 'Create Account' : 'Sign In'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'register' ? 'Register to take tests and view your results' : 'Access your tests and results'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder={mode === 'register' ? 'Min 6 characters' : 'Enter password'}
                required
                minLength={mode === 'register' ? 6 : undefined}
              />
            </div>

            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                mode === 'register' ? 'Create Account' : 'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              size="sm"
              onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              {mode === 'register' ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </Button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-500 dark:text-emerald-400" />
              Secure
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="size-3.5" />
              Private
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="size-3.5 text-amber-500 dark:text-amber-400" />
              Fast
            </span>
          </div>
        </div>
      </main>
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
