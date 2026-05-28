'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Test } from '@/types';
import { formatDuration } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';

interface TestWithStats extends Test {
  question_count: number;
  submission_count: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tests, setTests] = useState<TestWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

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

  const stats = useMemo(() => {
    const active = tests.filter((t) => t.is_active).length;
    const totalSubmissions = tests.reduce((s, t) => s + (t.submission_count || 0), 0);
    const totalQuestions = tests.reduce((s, t) => s + (t.question_count || 0), 0);
    return { totalTests: tests.length, active, totalSubmissions, totalQuestions };
  }, [tests]);

  const filteredTests = useMemo(() => {
    if (!query.trim()) return tests;
    const q = query.toLowerCase();
    return tests.filter(
      (t) => t.title.toLowerCase().includes(q) || t.access_code.toLowerCase().includes(q)
    );
  }, [tests, query]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border/70">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo size="sm" />
            <nav className="hidden md:flex items-center gap-1">
              <NavLink active onClick={() => router.push('/admin/dashboard')}>Tests</NavLink>
              <NavLink onClick={() => router.push('/admin/batches')}>Batches</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="w-px h-5 bg-border mx-1" />
            <button
              onClick={() => router.push('/admin/tests/new')}
              className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors shadow-sm shadow-primary/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New test
            </button>
            <button
              onClick={handleLogout}
              className="h-8 w-8 grid place-items-center text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Overview</p>
            <h1 className="text-2xl font-semibold tracking-tight">Tests</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage assessments, view submissions, and share access codes.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="status-dot text-emerald-500" />
            All systems normal
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KpiCard label="Total tests" value={stats.totalTests} icon={DocIcon} />
          <KpiCard label="Active" value={stats.active} icon={BoltIcon} accent />
          <KpiCard label="Submissions" value={stats.totalSubmissions} icon={UsersIcon} />
          <KpiCard label="Questions" value={stats.totalQuestions} icon={LayersIcon} />
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tests or access codes..."
              className="w-full h-9 pl-9 pr-3 text-sm bg-card border border-border rounded-md focus-ring transition-all"
            />
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {filteredTests.length} of {tests.length}
          </div>
        </div>

        {/* Table card */}
        <div className="surface-elevated overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredTests.length === 0 ? (
            <EmptyState
              hasTests={tests.length > 0}
              onCreate={() => router.push('/admin/tests/new')}
            />
          ) : (
            <div className="divide-y divide-border/70">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold bg-secondary/40">
                <div className="col-span-4">Test</div>
                <div className="col-span-2 text-center">Access code</div>
                <div className="col-span-1 text-center">Duration</div>
                <div className="col-span-1 text-center">Questions</div>
                <div className="col-span-1 text-center">Submissions</div>
                <div className="col-span-1 text-center">Status</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {filteredTests.map((test) => (
                <div
                  key={test.id}
                  className="grid grid-cols-12 gap-4 px-5 py-3.5 hover:bg-secondary/30 items-center transition-colors group"
                >
                  <div className="col-span-4 min-w-0">
                    <button
                      onClick={() => router.push(`/admin/tests/${test.id}`)}
                      className="text-sm font-medium text-foreground hover:text-primary truncate text-left transition-colors"
                    >
                      {test.title}
                    </button>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button
                      onClick={() => copyAccessLink(test.access_code, test.id)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/60 hover:bg-secondary border border-border/60 transition-colors"
                    >
                      <code className="text-xs text-primary font-mono font-semibold">{test.access_code}</code>
                      {copiedId === test.id ? (
                        <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-xs text-muted-foreground font-mono tabular-nums">{formatDuration(test.duration_minutes)}</span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-xs text-foreground font-mono tabular-nums">{test.question_count}</span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-xs text-foreground font-mono tabular-nums">{test.submission_count}</span>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {test.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground border border-border">
                        Off
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => router.push(`/admin/tests/${test.id}`)}
                      className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => router.push(`/admin/tests/${test.id}/results`)}
                      className="h-7 px-2.5 text-xs text-foreground bg-secondary hover:bg-secondary/70 rounded-md transition-colors"
                    >
                      Results →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NavLink({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        'h-8 px-3 rounded-md text-sm font-medium transition-colors ' +
        (active
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60')
      }
    >
      {children}
    </button>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.FC<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div
      className={
        'surface-elevated p-4 flex items-center gap-4 ' +
        (accent ? 'ring-1 ring-primary/20' : '')
      }
    >
      <div
        className={
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ' +
          (accent ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground')
        }
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className="text-xl font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
      </div>
    </div>
  );
}

function EmptyState({ hasTests, onCreate }: { hasTests: boolean; onCreate: () => void }) {
  return (
    <div className="text-center py-20 px-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 mb-4">
        <DocIcon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">
        {hasTests ? 'No tests match your search' : 'No tests yet'}
      </h3>
      <p className="text-xs text-muted-foreground mb-5 max-w-xs mx-auto">
        {hasTests
          ? 'Try a different keyword or clear filters to see all tests.'
          : 'Create your first assessment to share access codes with candidates.'}
      </p>
      {!hasTests && (
        <button
          onClick={onCreate}
          className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors shadow-sm shadow-primary/20"
        >
          Create your first test
        </button>
      )}
    </div>
  );
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}
