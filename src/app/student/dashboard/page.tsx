'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDuration, formatDate } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  ArrowRight,
  FileText,
  Eye,
  CalendarClock,
  PlayCircle,
} from 'lucide-react';

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

  const getTestForSubmission = (testId: string) => {
    return tests.find((t) => t.id === testId);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'DELETE' });
    router.push('/login');
  };

  // Split submissions into categories
  const inProgressSubmissions = submissions.filter((s) => s.status === 'in_progress');
  const completedSubmissions = submissions.filter((s) => s.status === 'graded' || s.status === 'submitted');

  // In-progress tests (started but not submitted)
  const activeTests = inProgressSubmissions.map((s) => ({
    submission: s,
    test: getTestForSubmission(s.test_id),
  })).filter((item) => item.test?.is_active);

  // Upcoming tests: assigned via batch but not yet started (no submission exists)
  const submittedTestIds = new Set(submissions.map((s) => s.test_id));
  const upcomingTests = tests.filter(
    (t) => !submittedTestIds.has(t.id) && t.is_active
  );

  // Calculate stats
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
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/50">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-24" />
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid grid-cols-3 gap-3 mb-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-7 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold uppercase">
              {(studentName?.[0] || email?.[0] || '?').toUpperCase()}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-medium text-foreground truncate">
                {studentName ? `Hi, ${studentName.split(' ')[0]}` : 'My Tests'}
              </p>
              <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px]">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="secondary" size="sm" onClick={() => router.push('/')}>
              <Plus />
              Take Test
            </Button>
            <Button variant="ghost" size="sm" className="font-mono text-muted-foreground" onClick={handleLogout}>
              logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Card className="py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Tests Taken</p>
              <p className="text-2xl font-mono text-foreground">{totalTests}</p>
            </CardContent>
          </Card>
          <Card className="py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Avg Score</p>
              <p className="text-2xl font-mono text-foreground">{avgScore}<span className="text-sm text-muted-foreground">%</span></p>
            </CardContent>
          </Card>
          <Card className="py-0 gap-0 bg-primary/10 border-primary/30">
            <CardContent className="p-4">
              <p className="text-[10px] text-primary uppercase tracking-wider mb-1">Best Score</p>
              <p className="text-2xl font-mono text-primary">{bestScore}<span className="text-sm text-primary/70">%</span></p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Tests (assigned but not started) */}
        {upcomingTests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-emerald-500" />
              Upcoming Tests
              <span className="text-xs text-muted-foreground font-mono">({upcomingTests.length})</span>
            </h2>
            <div className="space-y-2">
              {upcomingTests.map((test) => (
                <Card
                  key={test.id}
                  className="py-0 gap-0 bg-emerald-500/5 border-emerald-500/20"
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{test.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground font-mono">{formatDuration(test.duration_minutes)}</span>
                        <span className="text-xs text-muted-foreground">{test.question_count} questions</span>
                        <span className="text-xs text-muted-foreground">{test.total_points} points</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/test/${test.access_code}?email=${encodeURIComponent(email)}`)}
                      className="ml-4 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-zinc-900"
                    >
                      Start Test
                      <ArrowRight />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active / In-Progress Tests */}
        {activeTests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              In Progress
            </h2>
            <div className="space-y-2">
              {activeTests.map(({ submission, test }) => (
                <Card
                  key={submission.id}
                  className="py-0 gap-0 bg-amber-500/5 border-amber-500/20"
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{test?.title || 'Unknown Test'}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground font-mono">{formatDuration(test?.duration_minutes || 0)}</span>
                        <span className="text-xs text-muted-foreground">{test?.question_count || 0} questions</span>
                        {submission.started_at && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            Started {formatDate(submission.started_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/test/${test?.access_code}?email=${encodeURIComponent(email)}`)}
                      className="ml-4 bg-amber-600 hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-900"
                    >
                      <PlayCircle />
                      Resume
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Tests */}
        <div>
          <h2 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Completed Tests
            <span className="text-xs text-muted-foreground font-mono">({completedSubmissions.length})</span>
          </h2>

          {completedSubmissions.length === 0 ? (
            <div className="text-center py-16 bg-secondary/30 border border-border/30 border-dashed rounded-lg">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-secondary border border-border mb-4">
                <FileText className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-muted-foreground mb-1">No completed tests yet</p>
              <p className="text-xs text-muted-foreground">Your test results will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                <div className="col-span-4">Test</div>
                <div className="col-span-1 text-center">MCQ</div>
                <div className="col-span-1 text-center">Code</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-2 text-center">Date</div>
                <div className="col-span-2 text-right">Action</div>
              </div>

              {completedSubmissions.map((submission) => {
                const test = getTestForSubmission(submission.test_id);
                const maxPoints = test?.total_points || 0;
                const percentage = maxPoints > 0 ? Math.round((submission.total_score / maxPoints) * 100) : 0;

                return (
                  <div
                    key={submission.id}
                    className="grid grid-cols-12 gap-4 px-4 py-3 bg-card hover:bg-secondary/50 border border-border/50 rounded-lg items-center transition-colors group"
                  >
                    <div className="col-span-4">
                      <p className="text-sm font-medium text-foreground truncate">{test?.title || 'Unknown Test'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{test?.question_count || 0} questions</span>
                        {submission.auto_submitted && (
                          <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">Auto-submitted</Badge>
                        )}
                        {(submission.violation_count || 0) > 0 && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400">
                            {submission.violation_count} violation{submission.violation_count > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-sm text-muted-foreground font-mono">{submission.mcq_score}</span>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-sm text-muted-foreground font-mono">{submission.coding_score}</span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-sm font-mono font-medium text-primary">{submission.total_score}</span>
                      <span className="text-xs text-muted-foreground">/{maxPoints}</span>
                      <div className="mt-1">
                        <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percentage >= 70 ? 'bg-emerald-500' : percentage >= 40 ? 'bg-amber-500' : 'bg-destructive'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-xs text-muted-foreground">
                        {submission.submitted_at ? formatDate(submission.submitted_at) : '—'}
                      </span>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/student/results/${submission.id}`)}
                        className="text-muted-foreground opacity-0 group-hover:opacity-100"
                      >
                        <Eye />
                        Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
