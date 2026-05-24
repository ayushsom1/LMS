'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Batch } from '@/types';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';

export default function BatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDesc, setNewBatchDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');

  const fetchBatches = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/batches');
      if (response.ok) {
        const data = await response.json();
        setBatches(data);
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBatchName, description: newBatchDesc }),
      });

      if (response.ok) {
        setNewBatchName('');
        setNewBatchDesc('');
        setShowCreate(false);
        fetchBatches();
      }
    } catch (error) {
      console.error('Failed to create batch:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBatch = async (id: string) => {
    if (!confirm('Delete this batch? This will not delete the students, only the batch grouping.')) return;

    try {
      const response = await fetch(`/api/admin/batches/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchBatches();
      }
    } catch (error) {
      console.error('Failed to delete batch:', error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'DELETE' });
    router.push('/login');
  };

  const stats = useMemo(() => {
    const totalStudents = batches.reduce((s, b) => s + (b.student_count || 0), 0);
    return { batches: batches.length, totalStudents };
  }, [batches]);

  const filteredBatches = useMemo(() => {
    if (!query.trim()) return batches;
    const q = query.toLowerCase();
    return batches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q)
    );
  }, [batches, query]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border/70">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo size="sm" />
            <nav className="hidden md:flex items-center gap-1">
              <NavLink onClick={() => router.push('/admin/dashboard')}>Tests</NavLink>
              <NavLink active onClick={() => router.push('/admin/batches')}>Batches</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="w-px h-5 bg-border mx-1" />
            <button
              onClick={() => setShowCreate(true)}
              className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors shadow-sm shadow-primary/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New batch
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

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Overview</p>
            <h1 className="text-2xl font-semibold tracking-tight">Student batches</h1>
            <p className="text-sm text-muted-foreground mt-1">Group students to assign tests in bulk.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KpiCard label="Total batches" value={stats.batches} icon={UsersIcon} accent />
          <KpiCard label="Total students" value={stats.totalStudents} icon={UserIcon} />
          <KpiCard label="Avg. per batch" value={stats.batches > 0 ? Math.round(stats.totalStudents / stats.batches) : 0} icon={ChartIcon} />
          <KpiCard label="Active" value={stats.batches} icon={BoltIcon} />
        </div>

        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search batches..."
              className="w-full h-9 pl-9 pr-3 text-sm bg-card border border-border rounded-md focus-ring transition-all"
            />
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {filteredBatches.length} of {batches.length}
          </div>
        </div>

        <div className="surface-elevated overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-20 px-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 mb-4">
                <UsersIcon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">
                {batches.length > 0 ? 'No batches match your search' : 'No batches yet'}
              </h3>
              <p className="text-xs text-muted-foreground mb-5 max-w-xs mx-auto">
                {batches.length > 0
                  ? 'Try a different keyword or clear filters.'
                  : 'Group students into batches to assign tests in bulk.'}
              </p>
              {batches.length === 0 && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors shadow-sm shadow-primary/20"
                >
                  Create your first batch
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/70">
              {filteredBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/30 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center flex-shrink-0">
                    <UsersIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => router.push(`/admin/batches/${batch.id}`)}
                      className="text-sm font-medium text-foreground hover:text-primary truncate text-left transition-colors block w-full"
                    >
                      {batch.name}
                    </button>
                    {batch.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{batch.description}</p>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-foreground border border-border tabular-nums">
                    {batch.student_count || 0} students
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => router.push(`/admin/batches/${batch.id}`)}
                      className="h-7 px-2.5 text-xs text-foreground bg-secondary hover:bg-secondary/70 rounded-md transition-colors"
                    >
                      Manage →
                    </button>
                    <button
                      onClick={() => handleDeleteBatch(batch.id)}
                      className="h-7 w-7 grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      title="Delete batch"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md surface-elevated shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/70">
              <h2 className="text-sm font-semibold text-foreground tracking-tight">Create new batch</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="w-7 h-7 grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateBatch} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Batch name</label>
                <input
                  type="text"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g., Backend cohort · Spring 2026"
                  className="w-full h-10 px-3 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus-ring transition-colors"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newBatchDesc}
                  onChange={(e) => setNewBatchDesc(e.target.value)}
                  placeholder="e.g., Java/Spring focus, 6-week program"
                  className="w-full h-10 px-3 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus-ring transition-colors"
                />
              </div>
              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="h-9 px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="h-9 px-4 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors disabled:bg-muted shadow-sm shadow-primary/20"
                >
                  {creating ? 'Creating…' : 'Create batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    <div className={'surface-elevated p-4 flex items-center gap-4 ' + (accent ? 'ring-1 ring-primary/20' : '')}>
      <div className={'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ' + (accent ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground')}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className="text-xl font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
      </div>
    </div>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6m4 6V5m4 14v-9" />
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
