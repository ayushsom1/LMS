'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {session?.role === 'student' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/student/dashboard')}
              className="text-xs font-mono text-muted-foreground hover:text-primary"
            >
              my tests <ArrowRight className="size-3.5" />
            </Button>
          )}
          {session?.role === 'admin' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/dashboard')}
              className="text-xs font-mono text-muted-foreground hover:text-primary"
            >
              dashboard <ArrowRight className="size-3.5" />
            </Button>
          )}
          {!session && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/login')}
              className="text-xs font-mono text-muted-foreground hover:text-primary"
            >
              sign in <ArrowRight className="size-3.5" />
            </Button>
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
              <Input
                type="text"
                placeholder="••••••"
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value.toUpperCase());
                  setError('');
                }}
                maxLength={6}
                aria-invalid={!!error}
                className={cn(
                  'h-14 px-4 text-center text-2xl font-mono tracking-[0.5em]',
                  'placeholder:text-muted-foreground/30 placeholder:tracking-[0.3em]'
                )}
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

            <Button
              type="submit"
              disabled={loading || accessCode.length < 6}
              className="w-full h-11"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <span>Join Test</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          {/* Status indicator */}
          <div className="mt-8 flex justify-center">
            <Badge variant="outline" className="gap-2 font-normal text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              System online
            </Badge>
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
