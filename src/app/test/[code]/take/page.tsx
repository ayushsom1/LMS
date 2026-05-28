'use client';

import { useEffect, useState, useCallback, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CodeEditor from '@/components/CodeEditor';
import Toast, { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Maximize,
  Play,
  Loader2,
} from 'lucide-react';
import { Test, Question, TestCase } from '@/types';

interface RunResult {
  id: string;
  input: string;
  expected: string;
  actual: string | null;
  passed: boolean;
  error: string | null;
}

export default function TakeTestPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [result, setResult] = useState<{ mcq_score: number; coding_score: number; total_score: number } | null>(null);

  // Run code state
  const [running, setRunning] = useState(false);
  const [runResults, setRunResults] = useState<Record<string, RunResult[]>>({});

  // Security state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const fetchTestData = useCallback(async () => {
    try {
      const response = await fetch(`/api/test/${code}`);
      if (response.ok) {
        const data = await response.json();
        setTest(data.test);
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Failed to fetch test:', error);
    } finally {
      setLoading(false);
    }
  }, [code]);

  // Report violation to server
  const reportViolation = useCallback(async (type: string, message: string) => {
    const submissionId = sessionStorage.getItem(`test_${code}_submission`);
    if (!submissionId || submitted || submitting) return;

    try {
      const response = await fetch(`/api/test/${code}/violation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          violation: { type, message },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setViolationCount(data.violationCount);

        if (data.shouldAutoSubmit) {
          toast.error('Test auto-submitted due to multiple violations', 10000);
          setSubmitted(true);
          sessionStorage.removeItem(`test_${code}_submission`);
          sessionStorage.removeItem(`test_${code}_name`);
          sessionStorage.removeItem(`test_${code}_start`);
          // Redirect after showing message
          setTimeout(() => router.push(`/test/${code}`), 3000);
        } else {
          toast.warning(data.message, 5000);
        }
      }
    } catch (error) {
      console.error('Failed to report violation:', error);
    }
  }, [code, submitted, submitting, toast, router]);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    // Don't try to enter fullscreen if test is already submitted
    if (submitted || submitting) return;

    try {
      if (containerRef.current && document.fullscreenElement === null) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (error) {
      // Fullscreen request failed - likely due to missing user gesture
      // The overlay will prompt user to click "Enter Fullscreen" button
      console.log('Fullscreen requires user gesture');
    }
  }, [submitted, submitting]);

  // Initial setup
  useEffect(() => {
    const submissionId = sessionStorage.getItem(`test_${code}_submission`);
    const savedStartTime = sessionStorage.getItem(`test_${code}_start`);

    if (!submissionId) {
      router.push(`/test/${code}`);
      return;
    }

    setStartTime(parseInt(savedStartTime || Date.now().toString()));
    fetchTestData();
  }, [code, router, fetchTestData]);

  // Auto-enter fullscreen on load (separate effect to avoid dependency issues)
  useEffect(() => {
    if (submitted || submitting) return;

    const timer = setTimeout(() => {
      enterFullscreen();
    }, 500);

    return () => clearTimeout(timer);
  }, [enterFullscreen, submitted, submitting]);

  // Fullscreen change detection
  useEffect(() => {
    // Don't listen for fullscreen changes if test is done
    if (submitted || submitting) return;

    const handleFullscreenChange = () => {
      const isNowFullscreen = document.fullscreenElement !== null;
      setIsFullscreen(isNowFullscreen);

      if (!isNowFullscreen && !submitted && !submitting) {
        reportViolation('fullscreen_exit', 'Attempted to exit fullscreen mode');
        // Don't auto re-enter - browsers require user gesture
        // The fullscreen overlay will prompt user to click "Enter Fullscreen"
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [submitted, submitting, reportViolation, enterFullscreen]);

  // Visibility change detection (tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !submitted && !submitting) {
        reportViolation('visibility_hidden', 'Switched to another tab or window');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [submitted, submitting, reportViolation]);

  // Window blur detection (clicking outside)
  useEffect(() => {
    const handleBlur = () => {
      if (!submitted && !submitting) {
        reportViolation('window_blur', 'Window lost focus');
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [submitted, submitting, reportViolation]);

  // Auto-save answers every 30 seconds
  useEffect(() => {
    if (submitted || submitting) return;

    const autoSave = async () => {
      const submissionId = sessionStorage.getItem(`test_${code}_submission`);
      if (!submissionId || Object.keys(answers).length === 0) return;

      try {
        await fetch(`/api/test/${code}/save`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId, answers }),
        });
      } catch {
        // Silent fail — auto-save is best-effort
      }
    };

    // Jitter: 25–35s random interval to avoid thundering herd when 2000 students all
    // start at the same time and would otherwise auto-save simultaneously every 30s.
    const jitteredInterval = 25000 + Math.random() * 10000;
    const interval = setInterval(autoSave, jitteredInterval);
    return () => clearInterval(interval);
  }, [code, answers, submitted, submitting]);

  // Keyboard shortcut prevention
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common shortcuts
      if (
        (e.ctrlKey || e.metaKey) &&
        ['t', 'n', 'w', 'Tab'].includes(e.key)
      ) {
        e.preventDefault();
        toast.warning('This keyboard shortcut is disabled during the test');
      }
      // Prevent Alt+Tab on Windows (limited effectiveness)
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
      }
      // Prevent F11 (fullscreen toggle)
      if (e.key === 'F11') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toast]);

  // Timer effect
  useEffect(() => {
    if (!test || !startTime) return;

    const endTime = startTime + test.duration_minutes * 60 * 1000;

    const updateTimer = () => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(remaining);

      if (remaining <= 0 && !submitted && !submitting) {
        handleSubmit();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [test, startTime, submitted, submitting]);

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;

    const submissionId = sessionStorage.getItem(`test_${code}_submission`);
    if (!submissionId) return;

    setSubmitting(true);

    try {
      const response = await fetch(`/api/test/${code}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, answers }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setSubmitted(true);
        sessionStorage.removeItem(`test_${code}_submission`);
        sessionStorage.removeItem(`test_${code}_name`);
        sessionStorage.removeItem(`test_${code}_start`);

        // Exit fullscreen after submission
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
    } catch {
      toast.error('Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  }, [code, answers, submitting, submitted, toast]);

  const handleRunCode = async (questionId: string, testCases: TestCase[]) => {
    const studentCode = answers[questionId];
    if (!studentCode) {
      toast.warning('Please write some code first');
      return;
    }

    setRunning(true);
    setRunResults((prev) => ({ ...prev, [questionId]: [] }));

    try {
      const visibleTestCases = testCases.filter((tc) => !tc.is_hidden);

      const response = await fetch('/api/test/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: studentCode,
          testCases: visibleTestCases,
          language: 'cpp',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRunResults((prev) => ({ ...prev, [questionId]: data.results }));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to run code');
      }
    } catch {
      toast.error('Failed to run code');
    } finally {
      setRunning(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    if (runResults[questionId]) {
      setRunResults((prev) => ({ ...prev, [questionId]: [] }));
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <div className="flex-shrink-0 h-12 px-4 flex items-center justify-between border-b border-border/50 bg-card/50">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <div className="flex-shrink-0 px-4 py-2 border-b border-border/50 bg-card/30 flex gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-md" />
          ))}
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </main>
      </div>
    );
  }

  if (submitted && result) {
    // Calculate total possible scores from questions
    const mcqTotal = questions.filter(q => q.type === 'mcq').reduce((sum, q) => sum + q.points, 0);
    const codingTotal = questions.filter(q => q.type === 'coding').reduce((sum, q) => sum + q.points, 0);
    const totalPossible = mcqTotal + codingTotal;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Toast messages={toast.toasts} onRemove={toast.removeToast} />
        <div className="w-full max-w-sm text-center animate-in">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1.5">Submitted</h1>
          <p className="text-sm text-muted-foreground mb-6">Your test has been graded</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="surface-card p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">MCQ</p>
              <p className="text-xl font-mono tabular-nums text-foreground">
                {result.mcq_score}<span className="text-sm text-muted-foreground">/{mcqTotal}</span>
              </p>
            </div>
            <div className="surface-card p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Code</p>
              <p className="text-xl font-mono tabular-nums text-foreground">
                {result.coding_score}<span className="text-sm text-muted-foreground">/{codingTotal}</span>
              </p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-[10px] text-primary uppercase tracking-wider mb-1">Total</p>
              <p className="text-xl font-mono tabular-nums text-primary">
                {result.total_score}<span className="text-sm text-primary/70">/{totalPossible}</span>
              </p>
            </div>
          </div>

          {violationCount > 0 && (
            <Badge variant="outline" className="mb-4 border-amber-500/40 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-3" />
              {violationCount} violation(s) recorded
            </Badge>
          )}

          <p className="text-xs text-muted-foreground mb-6">Results will be sent to your email</p>

          <Button variant="secondary" size="lg" onClick={() => router.push('/')}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No questions available</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isLowTime = timeLeft < 5 * 60 * 1000;
  const isCriticalTime = timeLeft < 60 * 1000;
  const currentRunResults = runResults[currentQuestion.id] || [];
  const answeredCount = questions.filter((q) => !!answers[q.id]).length;

  return (
    <div ref={containerRef} className="h-screen bg-background flex flex-col overflow-hidden">
      <Toast messages={toast.toasts} onRemove={toast.removeToast} />

      {/* Fullscreen prompt overlay */}
      {!isFullscreen && !submitted && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center p-8 animate-in">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-amber-500/15 ring-1 ring-amber-500/30 flex items-center justify-center">
              <Maximize className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Fullscreen Required</h2>
            <p className="text-zinc-400 mb-6 text-sm">This test must be taken in fullscreen mode</p>
            <Button size="lg" onClick={enterFullscreen}>
              <Maximize className="size-4" />
              Enter Fullscreen
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 h-12 px-4 flex items-center justify-between border-b border-border/50 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">{test.title}</span>
          <Badge variant="secondary" className="font-mono tabular-nums shrink-0">
            Q{currentIndex + 1}/{questions.length}
          </Badge>
          {violationCount > 0 && (
            <Badge variant="outline" className="shrink-0 border-amber-500/40 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-3" />
              {violationCount}/3 warnings
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className={cn(
            "px-3 py-1.5 rounded-md font-mono tabular-nums text-sm font-medium tracking-tight",
            isCriticalTime
              ? 'bg-destructive/20 text-destructive animate-pulse'
              : isLowTime
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              : 'bg-secondary text-foreground'
          )}>
            {formatTime(timeLeft)}
          </div>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-zinc-900"
          >
            {submitting ? <><Loader2 className="size-3.5 animate-spin" />Submitting</> : 'Submit'}
          </Button>
        </div>
      </header>

      {/* Question navigation */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-border/50 bg-card/30 space-y-2">
        <div className="flex items-center gap-3">
          <Progress value={(answeredCount / questions.length) * 100} className="h-1.5" />
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums shrink-0">
            {answeredCount}/{questions.length} answered
          </span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {questions.map((q, index) => {
            const isAnswered = !!answers[q.id];
            const isCurrent = index === currentIndex;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(index)}
                aria-current={isCurrent ? 'true' : undefined}
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-md text-xs font-mono transition-all",
                  isCurrent
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                    : isAnswered
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                )}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Question header */}
          <div className="flex items-center gap-2 mb-3">
            <Badge
              variant="outline"
              className={cn(
                "uppercase",
                currentQuestion.type === 'mcq'
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400'
              )}
            >
              {currentQuestion.type}
            </Badge>
            <span className="text-[10px] text-muted-foreground font-mono tabular-nums">{currentQuestion.points} pts</span>
          </div>

          <h2 className="text-lg font-medium text-foreground mb-2">{currentQuestion.title}</h2>
          {currentQuestion.description && (
            <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{currentQuestion.description}</p>
          )}

          {/* MCQ Options */}
          {currentQuestion.type === 'mcq' && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((option, idx) => {
                // Support both {id, text} objects and plain strings
                const optionId = typeof option === 'string' ? option : option.id;
                const optionText = typeof option === 'string' ? option : option.text;
                const selected = answers[currentQuestion.id] === optionId;
                return (
                  <button key={optionId || idx}
                    onClick={() => handleAnswerChange(currentQuestion.id, optionId)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 group",
                      selected
                        ? 'bg-primary/10 border-primary/50 text-foreground'
                        : 'bg-card border-border/50 text-foreground hover:border-border hover:bg-accent/5'
                    )}
                  >
                    <span className={cn(
                      "flex-shrink-0 size-4 rounded-full border-2 flex items-center justify-center transition-colors",
                      selected ? 'border-primary' : 'border-muted-foreground/40 group-hover:border-muted-foreground'
                    )}>
                      {selected && <span className="size-2 rounded-full bg-primary" />}
                    </span>
                    <span className="text-sm">{optionText}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Coding Editor */}
          {currentQuestion.type === 'coding' && (
            <div className="space-y-4">
              {/* Test cases */}
              {currentQuestion.test_cases && currentQuestion.test_cases.filter(tc => !tc.is_hidden).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Sample Test Cases</p>
                  <div className="grid gap-2">
                    {currentQuestion.test_cases.filter(tc => !tc.is_hidden).map((tc, i) => {
                      const runResult = currentRunResults.find((r) => r.id === tc.id);
                      return (
                        <div
                          key={tc.id}
                          className={`p-3 border rounded-lg transition-all ${
                            runResult
                              ? runResult.passed
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-destructive/10 border-destructive/30'
                              : 'bg-card border-border/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">Test Case {i + 1}</span>
                            {runResult && (
                              <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${
                                runResult.passed
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-destructive/20 text-destructive'
                              }`}>
                                {runResult.passed ? 'Passed' : 'Failed'}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1">Input</p>
                              <pre className="text-xs text-foreground font-mono bg-secondary/50 p-2 rounded overflow-x-auto">
                                {tc.input || '(empty)'}
                              </pre>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1">Expected Output</p>
                              <pre className="text-xs text-foreground font-mono bg-secondary/50 p-2 rounded overflow-x-auto">
                                {tc.expected_output}
                              </pre>
                            </div>
                          </div>
                          {runResult && !runResult.passed && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              {runResult.error ? (
                                <div>
                                  <p className="text-[10px] text-destructive mb-1">Error</p>
                                  <pre className="text-xs text-destructive font-mono bg-destructive/10 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                                    {runResult.error}
                                  </pre>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-[10px] text-muted-foreground mb-1">Your Output</p>
                                  <pre className="text-xs text-foreground font-mono bg-secondary/50 p-2 rounded overflow-x-auto">
                                    {runResult.actual || '(empty)'}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Code Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Your Solution (C++)</p>
                  <Button
                    size="sm"
                    onClick={() => handleRunCode(currentQuestion.id, currentQuestion.test_cases || [])}
                    disabled={running || !answers[currentQuestion.id]}
                    className="bg-purple-600 hover:bg-purple-500 dark:bg-purple-500 dark:hover:bg-purple-400 text-white dark:text-zinc-900"
                  >
                    {running ? (
                      <><Loader2 className="size-3.5 animate-spin" />Running…</>
                    ) : (
                      <><Play className="size-3.5" />Run Code</>
                    )}
                  </Button>
                </div>
                <CodeEditor
                  value={answers[currentQuestion.id] || '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    \n    return 0;\n}'}
                  onChange={(code) => handleAnswerChange(currentQuestion.id, code)}
                  height="350px"
                />
              </div>

              {/* Run Results Summary */}
              {currentRunResults.length > 0 && (
                <div className={`p-3 rounded-lg border ${
                  currentRunResults.every(r => r.passed)
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}>
                  <div className="flex items-center gap-2">
                    {currentRunResults.every(r => r.passed) ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    <span className={`text-sm font-medium ${
                      currentRunResults.every(r => r.passed) ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {currentRunResults.filter(r => r.passed).length}/{currentRunResults.length} test cases passed
                    </span>
                  </div>
                  {currentRunResults.every(r => r.passed) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Note: There may be hidden test cases that will be evaluated on submission.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer navigation */}
      <footer className="flex-shrink-0 h-14 px-4 flex items-center justify-between border-t border-border/50 bg-card/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="size-3.5" />
          Previous
        </Button>
        <Button
          size="sm"
          onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
          disabled={currentIndex === questions.length - 1}
        >
          Next
          <ArrowRight className="size-3.5" />
        </Button>
      </footer>
    </div>
  );
}
