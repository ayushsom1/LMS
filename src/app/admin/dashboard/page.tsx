'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Test } from '@/types';
import { formatDuration } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';

interface TestWithStats extends Test {
  question_count: number;
  submission_count: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tests, setTests] = useState<TestWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
              className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
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
                  {test.is_active ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                      Live
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Off</span>
                  )}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
