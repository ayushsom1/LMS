'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Test } from '@/types';
import { formatDuration } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Copy, FileText, Plus, Users } from 'lucide-react';

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
            <Button variant="secondary" size="sm" onClick={() => router.push('/admin/batches')}>
              <Users />
              Batches
            </Button>
            <Button size="sm" onClick={() => router.push('/admin/tests/new')}>
              <Plus />
              New Test
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="font-mono text-muted-foreground">
              logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-4 px-4 py-2">
              <Skeleton className="col-span-4 h-3" />
              <Skeleton className="col-span-2 h-3" />
              <Skeleton className="col-span-6 h-3" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 border border-border/50 rounded-lg">
                <Skeleton className="h-5 w-1/3" />
              </div>
            ))}
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-secondary border border-border mb-4">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">No tests yet</p>
            <Button variant="secondary" onClick={() => router.push('/admin/tests/new')}>
              Create your first test
            </Button>
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
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-muted-foreground" />
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
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/tests/${test.id}`)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/tests/${test.id}/results`)}>
                    Results
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
