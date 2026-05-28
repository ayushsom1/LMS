'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import Toast, { useToast } from '@/components/Toast';
import Logo from '@/components/Logo';

export default function CreateTestPage() {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          duration_minutes: duration,
          is_active: isActive,
          starts_at: startsAt ? new Date(startsAt).toISOString() : null,
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        }),
      });

      if (response.ok) {
        const test = await response.json();
        router.push(`/admin/tests/${test.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create test');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toast messages={toast.toasts} onRemove={toast.removeToast} />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border/70">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="hover:text-foreground transition-colors"
              >
                Tests
              </button>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-foreground font-medium">New test</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8 animate-in">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Step 1 of 2</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create a new test</h1>
          <p className="text-sm text-muted-foreground mt-1">Set the basics now — you&apos;ll add questions in the next step.</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-5 animate-in" style={{ animationDelay: '60ms' }}>
          <div className="surface-elevated p-6 space-y-5">
            <Field
              label="Test title"
              hint="Shown to candidates when they enter the access code."
            >
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Backend Engineer Screening — Round 1"
                className="w-full h-10 px-3 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus-ring transition-colors"
                required
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Duration" hint="Between 5 and 300 minutes.">
                <div className="relative">
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                    className="w-full h-10 px-3 pr-14 bg-background border border-border rounded-md text-sm text-foreground tabular-nums focus-ring transition-colors"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono uppercase tracking-wider">min</span>
                </div>
              </Field>
              <Field label="Visibility" hint="You can flip this anytime.">
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-full h-10 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-between border ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-secondary text-muted-foreground border-border'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {isActive ? 'Active — accepting submissions' : 'Inactive'}
                  </span>
                  <Toggle on={isActive} />
                </button>
              </Field>
            </div>

            <div className="pt-1 border-t border-border/60">
              <div className="flex items-center gap-2 mt-4 mb-3">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-medium text-foreground">Scheduling window</span>
                <span className="text-[10px] text-muted-foreground font-normal">(optional)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Available from">
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-md text-sm text-foreground focus-ring transition-colors"
                  />
                </Field>
                <Field label="Available until">
                  <input
                    type="datetime-local"
                    value={endsAt}
                    min={startsAt || undefined}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-md text-sm text-foreground focus-ring transition-colors"
                  />
                </Field>
              </div>
              <p className="mt-2.5 text-[11px] text-muted-foreground">
                Leave blank for no schedule. Students can only start the test inside this window.
              </p>
            </div>
          </div>

          {/* Info card */}
          <div className="surface-card p-4 flex gap-3">
            <div className="w-8 h-8 rounded-md bg-primary/10 grid place-items-center flex-shrink-0">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xs text-muted-foreground space-y-1 pt-0.5">
              <p>A unique 6-character access code is generated automatically.</p>
              <p>You can add MCQ and coding questions in the next step, or bulk-import via Excel.</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push('/admin/dashboard')}
              className="h-10 px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="h-10 px-5 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Create test
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`relative inline-block w-8 h-4 rounded-full transition-colors ${
        on ? 'bg-emerald-500' : 'bg-muted-foreground/30'
      }`}
    >
      <span
        className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow ${
          on ? 'left-4' : 'left-0.5'
        }`}
      />
    </span>
  );
}
