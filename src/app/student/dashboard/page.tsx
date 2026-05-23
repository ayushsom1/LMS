'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDuration, formatDate } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';

interface TestInfo {
  id: string;
  title: string;
  duration_minutes: number;
  access_code: string;
  is_active: boolean;
  created_at: string;
  total_points: number;
  mcq_count: number;
  coding_count: number;
  question_count: number;
}

interface SubmissionInfo {
  id: string;
  test_id: string;
  student_name: string;
  student_email: string;
  mcq_score: number;
  coding_score: number;
  total_score: number;
  status: string;
  submitted_at: string | null;
  started_at: string | null;
  violation_count: number;
  auto_submitted: boolean;
  created_at: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [studentName, setStudentName] = useState('');
  const [submissions, setSubmissions] = useState<SubmissionInfo[]>([]);
  const [tests, setTests] = useState<TestInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/student/submissions`);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
        setTests(data.tests || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) throw new Error('Not logged in');
        return res.json();
      })
      .then((data) => {
        setEmail(data.user.email);
        setStudentName(data.user.name);
        fetchData();
      })
      .catch(() => {
        router.push('/login?next=/student/dashboard');
      });
  }, [router, fetchData]);

  const getTestForSubmission = (testId: string) => tests.find((t) => t.id === testId);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'DELETE' });
    router.push('/login');
  };

  const inProgressSubmissions = submissions.filter((s) => s.status === 'in_progress');
  const completedSubmissions = submissions.filter((s) => s.status === 'graded' || s.status === 'submitted');

  const activeTests = inProgressSubmissions
    .map((s) => ({ submission: s, test: getTestForSubmission(s.test_id) }))
    .filter((item) => item.test?.is_active);

  const submittedTestIds = new Set(submissions.map((s) => s.test_id));
  const upcomingTests = tests.filter((t) => !submittedTestIds.has(t.id) && t.is_active);

  const totalTests = completedSubmissions.length;
  const avgScore = totalTests > 0
    ? Math.round(completedSubmissions.reduce((sum, s) => {
        const test = getTestForSubmission(s.test_id);
        const maxPoints = test?.total_points || 1;
        return sum + (s.total_score / maxPoints) * 100;
      }, 0) / totalTests)
    : 0;
  const bestScore = totalTests > 0
    ? Math.round(Math.max(...completedSubmissions.map((s) => {
        const test = getTestForSubmission(s.test_id);
        const maxPoints = test?.total_points || 1;
        return (s.total_score / maxPoints) * 100;
      })))
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const firstName = studentName?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border/70">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 mr-2 text-xs">
              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 grid place-items-center text-[11px] font-semibold text-primary">
                {(studentName?.[0] || email?.[0] || '?').toUpperCase()}
              </div>
              <span className="text-muted-foreground font-mono truncate max-w-[180px]">{email}</span>
            </div>
            <ThemeToggle />
            <button
              onClick={() => router.push('/')}
              className="h-8 px-3 bg-primary text-primary-foreground text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors hover:bg-primary/90 shadow-sm shadow-primary/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Take test
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

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Dashboard</p>
          <h1 className="text-2xl font-semibold tracking-tight">Hi {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Here&apos;s an overview of your assessments.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatCard label="Tests taken" value={totalTests} />
          <StatCard label="Average score" value={`${avgScore}%`} />
          <StatCard label="Best score" value={`${bestScore}%`} accent />
        </div>

        {/* Upcoming */}
        {upcomingTests.length > 0 && (
          <Section
            title="Upcoming tests"
            badge={upcomingTests.length}
            badgeColor="emerald"
          >
            <div className="space-y-2">
              {upcomingTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-4 bg-card border border-emerald-500/20 rounded-lg hover:border-emerald-500/40 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 grid place-items-center flex-shrink-0">
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{test.title}</p>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                        <Meta icon="clock">{formatDuration(test.duration_minutes)}</Meta>
                        <Meta icon="layers">{test.question_count} questions</Meta>
                        <Meta icon="star">{test.total_points} points</Meta>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/test/${test.access_code}?email=${encodeURIComponent(email)}`)}
                    className="ml-4 h-9 px-4 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-emerald-950 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    Start test
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Active / In-Progress */}
        {activeTests.length > 0 && (
          <Section title="In progress" badge={activeTests.length} badgeColor="amber">
            <div className="space-y-2">
              {activeTests.map(({ submission, test }) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-4 bg-card border border-amber-500/20 rounded-lg"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 grid place-items-center flex-shrink-0">
                      <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{test?.title || 'Unknown Test'}</p>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                        <Meta icon="clock">{formatDuration(test?.duration_minutes || 0)}</Meta>
                        <Meta icon="layers">{test?.question_count || 0} questions</Meta>
                        {submission.started_at && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            Started {formatDate(submission.started_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/test/${test?.access_code}?email=${encodeURIComponent(email)}`)}
                    className="ml-4 h-9 px-4 bg-amber-600 hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-amber-950 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    Resume
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Completed */}
        <Section title="Completed tests" badge={completedSubmissions.length}>
          {completedSubmissions.length === 0 ? (
            <div className="text-center py-16 surface-elevated">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No completed tests yet</p>
              <p className="text-xs text-muted-foreground">Your results will appear here once you finish a test.</p>
            </div>
          ) : (
            <div className="surface-elevated overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold bg-secondary/40">
                <div className="col-span-4">Test</div>
                <div className="col-span-1 text-center">MCQ</div>
                <div className="col-span-1 text-center">Code</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-2 text-center">Date</div>
                <div className="col-span-2 text-right">Action</div>
              </div>

              <div className="divide-y divide-border/70">
                {completedSubmissions.map((submission) => {
                  const test = getTestForSubmission(submission.test_id);
                  const maxPoints = test?.total_points || 0;
                  const percentage = maxPoints > 0 ? Math.round((submission.total_score / maxPoints) * 100) : 0;

                  return (
                    <div
                      key={submission.id}
                      className="grid grid-cols-12 gap-4 px-5 py-3.5 hover:bg-secondary/30 items-center transition-colors group"
                    >
                      <div className="col-span-4 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{test?.title || 'Unknown Test'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{test?.question_count || 0} questions</span>
                          {submission.auto_submitted && (
                            <span className="text-[10px] text-destructive">· Auto-submitted</span>
                          )}
                          {(submission.violation_count || 0) > 0 && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">
                              · {submission.violation_count} violation{submission.violation_count > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-sm text-muted-foreground font-mono tabular-nums">{submission.mcq_score}</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-sm text-muted-foreground font-mono tabular-nums">{submission.coding_score}</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <div>
                          <span className="text-sm font-semibold font-mono tabular-nums text-foreground">{submission.total_score}</span>
                          <span className="text-xs text-muted-foreground">/{maxPoints}</span>
                          <span className={
                            'ml-1.5 text-[10px] font-semibold ' +
                            (percentage >= 70 ? 'text-emerald-600 dark:text-emerald-400'
                              : percentage >= 40 ? 'text-amber-600 dark:text-amber-400'
                              : 'text-destructive')
                          }>
                            {percentage}%
                          </span>
                        </div>
                        <div className="mt-1.5 w-full h-1 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={
                              'h-full rounded-full transition-all ' +
                              (percentage >= 70 ? 'bg-emerald-500'
                                : percentage >= 40 ? 'bg-amber-500'
                                : 'bg-destructive')
                            }
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {submission.submitted_at ? formatDate(submission.submitted_at) : '—'}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <button
                          onClick={() => router.push(`/student/results/${submission.id}`)}
                          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
                        >
                          View
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  badge,
  badgeColor,
  children,
}: {
  title: string;
  badge?: number;
  badgeColor?: 'emerald' | 'amber';
  children: React.ReactNode;
}) {
  const dotColor = badgeColor === 'emerald'
    ? 'bg-emerald-500'
    : badgeColor === 'amber'
      ? 'bg-amber-500 animate-pulse'
      : 'bg-muted-foreground/40';
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className={'w-1.5 h-1.5 rounded-full ' + dotColor} />
        <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>
        {typeof badge === 'number' && (
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">({badge})</span>
        )}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div
      className={
        'surface-elevated p-4 ' + (accent ? 'ring-1 ring-primary/20 bg-primary/[0.03]' : '')
      }
    >
      <p className={'text-[10px] uppercase tracking-wider mb-1 font-medium ' + (accent ? 'text-primary' : 'text-muted-foreground')}>
        {label}
      </p>
      <p className={'text-2xl font-semibold tabular-nums tracking-tight ' + (accent ? 'text-primary' : 'text-foreground')}>
        {value}
      </p>
    </div>
  );
}

function Meta({ icon, children }: { icon: 'clock' | 'layers' | 'star'; children: React.ReactNode }) {
  const Icon = {
    clock: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    layers: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    star: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  }[icon];
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {Icon}
      {children}
    </span>
  );
}
