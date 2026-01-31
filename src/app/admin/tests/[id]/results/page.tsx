'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Test, Submission, Batch, BatchStudent } from '@/types';
import { formatDate } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';
import Toast, { useToast } from '@/components/Toast';

interface BatchWithStudents extends Batch {
  students: BatchStudent[];
}

export default function TestResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [test, setTest] = useState<Test | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [batches, setBatches] = useState<BatchWithStudents[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [groupByBatch, setGroupByBatch] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [testRes, submissionsRes, testBatchesRes] = await Promise.all([
        fetch(`/api/admin/tests/${id}`),
        fetch(`/api/admin/tests/${id}/submissions`),
        fetch(`/api/admin/tests/${id}/send`),
      ]);

      if (testRes.ok) {
        setTest(await testRes.json());
      }
      if (submissionsRes.ok) {
        setSubmissions(await submissionsRes.json());
      }

      // Get batches linked to this test
      if (testBatchesRes.ok) {
        const testBatches = await testBatchesRes.json();
        const batchIds = testBatches.map((tb: { batch_id: string }) => tb.batch_id);

        // Fetch batch details with students
        const batchesWithStudents: BatchWithStudents[] = [];
        for (const batchId of batchIds) {
          const batchRes = await fetch(`/api/admin/batches/${batchId}`);
          if (batchRes.ok) {
            const data = await batchRes.json();
            batchesWithStudents.push({ ...data.batch, students: data.students });
          }
        }
        setBatches(batchesWithStudents);
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
        toast.success(`Results sent to ${submission.student_email}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send email');
      }
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSendingEmail(null);
    }
  };

  const getStatusStyle = (status: string, autoSubmitted?: boolean) => {
    if (autoSubmitted) {
      return 'bg-destructive/20 text-destructive border-destructive/30';
    }
    switch (status) {
      case 'graded':
        return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'submitted':
        return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status: string, autoSubmitted?: boolean) => {
    if (autoSubmitted) return 'Auto-submitted';
    switch (status) {
      case 'graded':
        return 'Graded';
      case 'submitted':
        return 'Pending';
      default:
        return 'In Progress';
    }
  };

  // Group submissions by batch
  const getSubmissionsByBatch = () => {
    const grouped: Record<string, { batch: BatchWithStudents | null; submissions: Submission[] }> = {};

    // Initialize groups for each batch
    batches.forEach((batch) => {
      grouped[batch.id] = { batch, submissions: [] };
    });

    // Add an "Other" group for submissions not in any batch
    grouped['other'] = { batch: null, submissions: [] };

    // Categorize submissions
    submissions.forEach((sub) => {
      let found = false;
      for (const batch of batches) {
        if (batch.students.some((s) => s.email.toLowerCase() === sub.student_email.toLowerCase())) {
          grouped[batch.id].submissions.push(sub);
          found = true;
          break;
        }
      }
      if (!found) {
        grouped['other'].submissions.push(sub);
      }
    });

    return grouped;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate stats
  const gradedSubmissions = submissions.filter((s) => s.status === 'graded');
  const avgScore =
    gradedSubmissions.length > 0
      ? Math.round(gradedSubmissions.reduce((sum, s) => sum + s.total_score, 0) / gradedSubmissions.length)
      : 0;
  const highScore = gradedSubmissions.length > 0 ? Math.max(...gradedSubmissions.map((s) => s.total_score)) : 0;
  const violationCount = submissions.filter((s) => (s.violation_count || 0) > 0).length;

  const groupedSubmissions = getSubmissionsByBatch();

  const renderSubmissionRow = (submission: Submission) => (
    <div
      key={submission.id}
      className="grid grid-cols-12 gap-4 px-4 py-3 bg-card hover:bg-secondary/50 border border-border/50 rounded-lg items-center transition-colors group"
    >
      <div className="col-span-3">
        <p className="text-sm font-medium text-foreground truncate">{submission.student_name}</p>
        {(submission.violation_count || 0) > 0 && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400">
            {submission.violation_count} violation{(submission.violation_count || 0) > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="col-span-2">
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
      <div className="col-span-2 flex justify-center">
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusStyle(
            submission.status,
            submission.auto_submitted
          )}`}
        >
          {getStatusLabel(submission.status, submission.auto_submitted)}
        </span>
      </div>
      <div className="col-span-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => router.push(`/admin/tests/${id}/results/${submission.id}`)}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          Details
        </button>
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Email
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Toast messages={toast.toasts} onRemove={toast.removeToast} />

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
          <div className="flex items-center gap-2">
            {batches.length > 0 && (
              <button
                onClick={() => setGroupByBatch(!groupByBatch)}
                className={`h-8 px-3 text-xs rounded transition-colors flex items-center gap-1.5 ${
                  groupByBatch
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                Group by Batch
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3 mb-6">
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
          <div className="p-4 bg-card border border-border/50 rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Violations</p>
            <p className={`text-2xl font-mono ${violationCount > 0 ? 'text-amber-500' : 'text-foreground'}`}>
              {violationCount}
            </p>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-20 bg-secondary/30 border border-border/30 border-dashed rounded-lg">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-secondary border border-border mb-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">No submissions yet</p>
          </div>
        ) : groupByBatch && batches.length > 0 ? (
          // Grouped by batch view
          <div className="space-y-6">
            {Object.entries(groupedSubmissions).map(([key, { batch, submissions: batchSubmissions }]) => {
              if (batchSubmissions.length === 0) return null;

              const batchAvg =
                batchSubmissions.filter((s) => s.status === 'graded').length > 0
                  ? Math.round(
                      batchSubmissions.filter((s) => s.status === 'graded').reduce((sum, s) => sum + s.total_score, 0) /
                        batchSubmissions.filter((s) => s.status === 'graded').length
                    )
                  : 0;

              return (
                <div key={key} className="space-y-2">
                  {/* Batch header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-foreground">{batch?.name || 'Other Students'}</span>
                      <span className="text-xs text-muted-foreground">({batchSubmissions.length} submissions)</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg: <span className="font-mono text-foreground">{batchAvg}</span>
                    </div>
                  </div>

                  {/* Table header */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    <div className="col-span-3">Student</div>
                    <div className="col-span-2">Email</div>
                    <div className="col-span-1 text-center">MCQ</div>
                    <div className="col-span-1 text-center">Code</div>
                    <div className="col-span-1 text-center">Total</div>
                    <div className="col-span-2 text-center">Status</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  {/* Rows */}
                  {batchSubmissions.map(renderSubmissionRow)}
                </div>
              );
            })}
          </div>
        ) : (
          // Flat view
          <div className="space-y-2">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              <div className="col-span-3">Student</div>
              <div className="col-span-2">Email</div>
              <div className="col-span-1 text-center">MCQ</div>
              <div className="col-span-1 text-center">Code</div>
              <div className="col-span-1 text-center">Total</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Rows */}
            {submissions.map(renderSubmissionRow)}
          </div>
        )}

        {/* Footer info */}
        {submissions.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              {submissions.filter((s) => s.submitted_at).length > 0 && (
                <>
                  Last submission:{' '}
                  {formatDate(
                    submissions
                      .filter((s) => s.submitted_at)
                      .sort((a, b) => new Date(b.submitted_at!).getTime() - new Date(a.submitted_at!).getTime())[0]
                      ?.submitted_at || ''
                  )}
                </>
              )}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
