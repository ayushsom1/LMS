'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Test, Submission } from '@/types';
import { formatDate } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';

export default function TestResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [test, setTest] = useState<Test | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [testRes, submissionsRes] = await Promise.all([
        fetch(`/api/admin/tests/${id}`),
        fetch(`/api/admin/tests/${id}/submissions`),
      ]);

      if (testRes.ok) {
        setTest(await testRes.json());
      }
      if (submissionsRes.ok) {
        setSubmissions(await submissionsRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSendEmail = async (submission: Submission) => {
    setSendingEmail(submission.id);
    try {
      const response = await fetch('/api/email/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id,
          testId: id,
        }),
      });

      if (response.ok) {
        alert('Results email sent successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send email');
      }
    } catch {
      alert('Failed to send email');
    } finally {
      setSendingEmail(null);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'graded':
        return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'submitted':
        return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'graded':
        return 'Graded';
      case 'submitted':
        return 'Pending';
      default:
        return 'In Progress';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate stats
  const gradedSubmissions = submissions.filter(s => s.status === 'graded');
  const avgScore = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((sum, s) => sum + s.total_score, 0) / gradedSubmissions.length)
    : 0;
  const highScore = gradedSubmissions.length > 0
    ? Math.max(...gradedSubmissions.map(s => s.total_score))
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/admin/tests/${id}`)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <span className="text-sm font-medium text-foreground">Results</span>
              {test && <span className="text-xs text-muted-foreground ml-2 font-mono">/ {test.title}</span>}
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 bg-card border border-border/50 rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Submissions</p>
            <p className="text-2xl font-mono text-foreground">{submissions.length}</p>
          </div>
          <div className="p-4 bg-card border border-border/50 rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Avg Score</p>
            <p className="text-2xl font-mono text-foreground">{avgScore}</p>
          </div>
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-[10px] text-primary uppercase tracking-wider mb-1">High Score</p>
            <p className="text-2xl font-mono text-primary">{highScore}</p>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-20 bg-secondary/30 border border-border/30 border-dashed rounded-lg">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-secondary border border-border mb-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">No submissions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              <div className="col-span-3">Student</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-1 text-center">MCQ</div>
              <div className="col-span-1 text-center">Code</div>
              <div className="col-span-1 text-center">Total</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Rows */}
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 bg-card hover:bg-secondary/50 border border-border/50 rounded-lg items-center transition-colors group"
              >
                <div className="col-span-3">
                  <p className="text-sm font-medium text-foreground truncate">{submission.student_name}</p>
                </div>
                <div className="col-span-3">
                  <p className="text-xs text-muted-foreground truncate font-mono">{submission.student_email}</p>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-sm text-muted-foreground font-mono">{submission.mcq_score}</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-sm text-muted-foreground font-mono">{submission.coding_score}</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-sm text-primary font-mono font-medium">{submission.total_score}</span>
                </div>
                <div className="col-span-1 flex justify-center">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusStyle(submission.status)}`}>
                    {getStatusLabel(submission.status)}
                  </span>
                </div>
                <div className="col-span-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {submission.status === 'graded' && (
                    <button
                      onClick={() => handleSendEmail(submission)}
                      disabled={sendingEmail === submission.id}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-50 rounded transition-colors flex items-center gap-1"
                    >
                      {sendingEmail === submission.id ? (
                        <>
                          <div className="w-3 h-3 border border-muted-foreground border-t-foreground rounded-full animate-spin" />
                          Sending
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Email
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer info */}
        {submissions.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              {submissions.filter(s => s.submitted_at).length > 0 && (
                <>
                  Last submission: {formatDate(submissions.filter(s => s.submitted_at).sort((a, b) =>
                    new Date(b.submitted_at!).getTime() - new Date(a.submitted_at!).getTime()
                  )[0]?.submitted_at || '')}
                </>
              )}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
