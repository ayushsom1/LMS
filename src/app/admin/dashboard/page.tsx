'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Test } from '@/types';
import { formatDuration } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';
import Toast, { useToast } from '@/components/Toast';
import { getTestAccessStatus } from '@/lib/test-access';

function TestStatusBadge({ test }: { test: Pick<Test, 'is_active' | 'starts_at' | 'ends_at'> }) {
  const { status } = getTestAccessStatus(test);
  const styles: Record<typeof status, { dot: string; label: string; text: string }> = {
    open: { dot: 'bg-emerald-500 dark:bg-emerald-400', label: 'Live', text: 'text-emerald-600 dark:text-emerald-400' },
    not_started: { dot: 'bg-amber-500', label: 'Scheduled', text: 'text-amber-600 dark:text-amber-400' },
    ended: { dot: 'bg-zinc-400', label: 'Ended', text: 'text-muted-foreground' },
    inactive: { dot: 'bg-zinc-500', label: 'Off', text: 'text-muted-foreground' },
  };
  const s = styles[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${s.text} uppercase tracking-wider`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

interface TestWithStats extends Test {
  question_count: number;
  submission_count: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tests, setTests] = useState<TestWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TestWithStats | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const handleDeleteTest = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/tests/${deleteTarget.id}`, { method: 'DELETE' });
      if (response.ok) {
        setTests((prev) => prev.filter((t) => t.id !== deleteTarget.id));
        toast.success(`Deleted "${deleteTarget.title}"`);
        setDeleteTarget(null);
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || 'Failed to delete test');
      }
    } catch {
      toast.error('Failed to delete test');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await fetch('/api/admin/tests');
      if (response.ok) {
        const data = await response.json();
        setTests(data);
      }
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'DELETE' });
    router.push('/login');
  };

  const copyAccessLink = async (code: string, id: string) => {
    const url = `${window.location.origin}/test/${code}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm font-medium text-foreground">Dashboard</span>
            <span className="text-xs text-muted-foreground font-mono">/ tests</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => router.push('/admin/batches')}
              className="h-8 px-3 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Batches
            </button>
            <button
              onClick={() => router.push('/admin/tests/new')}
              className="btn-shine h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Test
            </button>
            <button
              onClick={handleLogout}
              className="h-8 px-3 text-muted-foreground hover:text-foreground text-xs font-mono transition-colors"
            >
              logout
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-secondary border border-border mb-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground mb-4">No tests yet</p>
            <button
              onClick={() => router.push('/admin/tests/new')}
              className="h-9 px-4 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium rounded transition-colors"
            >
              Create your first test
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              <div className="col-span-4">Test</div>
              <div className="col-span-2 text-center">Code</div>
              <div className="col-span-1 text-center">Duration</div>
              <div className="col-span-1 text-center">Questions</div>
              <div className="col-span-1 text-center">Submissions</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Test rows */}
            {tests.map((test) => (
              <div
                key={test.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 bg-card hover:bg-secondary/50 border border-border/50 rounded-lg items-center transition-colors group"
              >
                <div className="col-span-4">
                  <p className="text-sm font-medium text-foreground truncate">{test.title}</p>
                </div>
                <div className="col-span-2 flex justify-center">
                  <button
                    onClick={() => copyAccessLink(test.access_code, test.id)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <code className="text-xs text-primary font-mono">{test.access_code}</code>
                    {copiedId === test.id ? (
                      <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-xs text-muted-foreground font-mono">{formatDuration(test.duration_minutes)}</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-xs text-muted-foreground font-mono">{test.question_count}</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-xs text-muted-foreground font-mono">{test.submission_count}</span>
                </div>
                <div className="col-span-1 flex justify-center">
                  <TestStatusBadge test={test} />
                </div>
                <div className="col-span-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => router.push(`/admin/tests/${test.id}`)}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => router.push(`/admin/tests/${test.id}/results`)}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                  >
                    Results
                  </button>
                  <button
                    onClick={() => setDeleteTarget(test)}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    title="Delete test"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Toast messages={toast.toasts} onRemove={toast.removeToast} />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-sm bg-background border border-border/50 rounded-lg shadow-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Delete test?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  &quot;{deleteTarget.title}&quot; and all of its questions
                  {deleteTarget.submission_count > 0 && (
                    <> plus <span className="text-destructive font-medium">{deleteTarget.submission_count}</span> submission{deleteTarget.submission_count === 1 ? '' : 's'}</>
                  )}
                  {' '}will be permanently removed. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 h-9 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTest}
                disabled={deleting}
                className="flex-1 h-9 text-xs font-medium bg-destructive hover:bg-destructive/90 disabled:bg-muted disabled:text-muted-foreground text-white rounded transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
