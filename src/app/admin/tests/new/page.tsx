'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import Toast, { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, ChevronRight, CalendarClock, Info, Loader2 } from 'lucide-react';

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
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center gap-2"
              aria-label="Testrainer home"
            >
              <span className="size-7 rounded-lg bg-primary text-primary-foreground grid place-items-center text-sm font-bold">T</span>
              <span className="text-sm font-semibold tracking-tight text-foreground">Testrainer</span>
            </button>
            <Separator orientation="vertical" className="h-5 hidden md:block" />
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="hover:text-foreground transition-colors"
              >
                Tests
              </button>
              <ChevronRight className="size-3" />
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
          <div className="surface-elevated p-6 space-y-6">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Test title</Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Backend Engineer Screening — Round 1"
                required
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">Shown to candidates when they enter the access code.</p>
            </div>

            {/* Duration */}
            <div className="space-y-1.5 sm:max-w-[14rem]">
              <Label htmlFor="duration">Duration</Label>
              <div className="relative">
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={300}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                  className="pr-14 tabular-nums"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono uppercase tracking-wider pointer-events-none">min</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Between 5 and 300 minutes.</p>
            </div>

            {/* Visibility — settings row, no wrapping */}
            <label
              htmlFor="visibility"
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3 cursor-pointer"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cnDot(isActive)}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isActive ? 'Accepting submissions. You can flip this anytime.' : 'Not accepting submissions yet.'}
                </p>
              </div>
              <Switch id="visibility" checked={isActive} onCheckedChange={setIsActive} aria-label="Toggle visibility" />
            </label>

            <Separator />

            {/* Scheduling window */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarClock className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Scheduling window</span>
                <span className="text-[11px] text-muted-foreground font-normal">(optional)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="startsAt">Available from</Label>
                  <Input
                    id="startsAt"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endsAt">Available until</Label>
                  <Input
                    id="endsAt"
                    type="datetime-local"
                    value={endsAt}
                    min={startsAt || undefined}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </div>
              </div>
              <p className="mt-2.5 text-[11px] text-muted-foreground">
                Leave blank for no schedule. Students can only start the test inside this window.
              </p>
            </div>
          </div>

          {/* Info card */}
          <div className="surface-card p-4 flex gap-3">
            <div className="size-8 rounded-md bg-primary/10 grid place-items-center flex-shrink-0">
              <Info className="size-4 text-primary" />
            </div>
            <div className="text-xs text-muted-foreground space-y-1 pt-0.5">
              <p>A unique 6-character access code is generated automatically.</p>
              <p>You can add MCQ and coding questions in the next step, or bulk-import via Excel.</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/admin/dashboard')}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>Create test<ArrowRight className="size-4" /></>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

function cnDot(active: boolean) {
  return [
    'size-1.5 rounded-full',
    active ? 'bg-emerald-500 dark:bg-emerald-400 pulse-slow' : 'bg-muted-foreground/40',
  ].join(' ');
}
