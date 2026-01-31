'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import Toast, { useToast } from '@/components/Toast';

export default function CreateTestPage() {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, duration_minutes: duration, is_active: isActive }),
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
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <span className="text-sm font-medium text-foreground">New Test</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="max-w-md mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 mb-4">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Create Test</h1>
          <p className="text-sm text-muted-foreground mt-1">Set up your test details</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="p-4 bg-card border border-border/50 rounded-lg space-y-4">
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">
                Test Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Midterm Exam 2024"
                className="w-full h-10 px-3 bg-background border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">
                  Duration
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                    className="w-full h-10 px-3 pr-12 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">min</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">
                  Status
                </label>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-full h-10 px-3 rounded text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-secondary text-muted-foreground border border-border'
                  }`}
                >
                  {isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-secondary/50 border border-border/30 rounded text-xs text-muted-foreground space-y-1">
            <p>• An access code will be auto-generated</p>
            <p>• Add questions after creating the test</p>
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full h-11 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-medium rounded transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Create Test
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
