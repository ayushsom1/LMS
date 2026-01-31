'use client';

import { useEffect, useState, useCallback, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CodeEditor from '@/components/CodeEditor';
import Toast, { useToast } from '@/components/Toast';
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
      console.error('Failed to enter fullscreen:', error);
      // Only show warning if not submitted
      if (!submitted && !submitting) {
        toast.warning('Please allow fullscreen mode for the test');
      }
    }
  }, [toast, submitted, submitting]);

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

      if (!isNowFullscreen) {
        reportViolation('fullscreen_exit', 'Attempted to exit fullscreen mode');
        // Try to re-enter fullscreen after a short delay
        setTimeout(() => {
          enterFullscreen();
        }, 100);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
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
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Submitted</h1>
          <p className="text-sm text-muted-foreground mb-6">Your test has been graded</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-4 bg-card border border-border/50 rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">MCQ</p>
              <p className="text-xl font-mono text-foreground">
                {result.mcq_score}<span className="text-sm text-muted-foreground">/{mcqTotal}</span>
              </p>
            </div>
            <div className="p-4 bg-card border border-border/50 rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Code</p>
              <p className="text-xl font-mono text-foreground">
                {result.coding_score}<span className="text-sm text-muted-foreground">/{codingTotal}</span>
              </p>
            </div>
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <p className="text-[10px] text-primary uppercase tracking-wider mb-1">Total</p>
              <p className="text-xl font-mono text-primary">
                {result.total_score}<span className="text-sm text-primary/70">/{totalPossible}</span>
              </p>
            </div>
          </div>

          {violationCount > 0 && (
            <p className="text-xs text-amber-500 mb-4">
              {violationCount} violation(s) recorded during the test
            </p>
          )}

          <p className="text-xs text-muted-foreground mb-6">Results will be sent to your email</p>

          <button
            onClick={() => router.push('/')}
            className="h-10 px-6 bg-secondary hover:bg-secondary/80 text-foreground text-sm rounded transition-colors"
          >
            Done
          </button>
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

  return (
    <div ref={containerRef} className="h-screen bg-background flex flex-col overflow-hidden">
      <Toast messages={toast.toasts} onRemove={toast.removeToast} />

      {/* Fullscreen prompt overlay */}
      {!isFullscreen && !submitted && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <div className="text-center p-8">
            <svg className="w-16 h-16 text-amber-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <h2 className="text-xl font-semibold text-white mb-2">Fullscreen Required</h2>
            <p className="text-zinc-400 mb-6">This test must be taken in fullscreen mode</p>
            <button
              onClick={enterFullscreen}
              className="h-10 px-6 bg-primary hover:bg-primary/90 text-white font-medium rounded transition-colors"
            >
              Enter Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 h-12 px-4 flex items-center justify-between border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">{test.title}</span>
          <span className="text-xs text-muted-foreground">
            Q{currentIndex + 1}/{questions.length}
          </span>
          {violationCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
              {violationCount}/3 warnings
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded font-mono text-sm ${
            isCriticalTime
              ? 'bg-destructive/20 text-destructive animate-pulse'
              : isLowTime
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              : 'bg-secondary text-foreground'
          }`}>
            {formatTime(timeLeft)}
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-8 px-4 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:bg-muted text-white dark:text-zinc-900 text-xs font-medium rounded transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </header>

      {/* Question navigation */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-border/50 bg-card/30">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {questions.map((q, index) => {
            const isAnswered = !!answers[q.id];
            const isCurrent = index === currentIndex;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-8 h-8 rounded text-xs font-mono transition-all ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : isAnswered
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
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
            <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${
              currentQuestion.type === 'mcq' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
            }`}>
              {currentQuestion.type}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">{currentQuestion.points} pts</span>
          </div>

          <h2 className="text-lg font-medium text-foreground mb-2">{currentQuestion.title}</h2>
          {currentQuestion.description && (
            <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{currentQuestion.description}</p>
          )}

          {/* MCQ Options */}
          {currentQuestion.type === 'mcq' && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleAnswerChange(currentQuestion.id, option.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    answers[currentQuestion.id] === option.id
                      ? 'bg-primary/10 border-primary/50 text-foreground'
                      : 'bg-card border-border/50 text-foreground hover:border-border'
                  }`}
                >
                  <span className="text-sm">{option.text}</span>
                </button>
              ))}
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
                  <button
                    onClick={() => handleRunCode(currentQuestion.id, currentQuestion.test_cases || [])}
                    disabled={running || !answers[currentQuestion.id]}
                    className="h-7 px-3 bg-purple-600 hover:bg-purple-500 dark:bg-purple-500 dark:hover:bg-purple-400 disabled:bg-muted disabled:text-muted-foreground text-white dark:text-zinc-900 text-xs font-medium rounded transition-colors flex items-center gap-1.5"
                  >
                    {running ? (
                      <>
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Run Code
                      </>
                    )}
                  </button>
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
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
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
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="h-9 px-4 text-xs text-muted-foreground disabled:text-muted-foreground/50 hover:text-foreground disabled:hover:text-muted-foreground/50 bg-secondary/50 hover:bg-secondary disabled:bg-transparent rounded transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>
        <button
          onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
          disabled={currentIndex === questions.length - 1}
          className="h-9 px-4 text-xs text-primary-foreground disabled:text-muted-foreground bg-primary hover:bg-primary/90 disabled:bg-secondary rounded transition-colors flex items-center gap-1.5"
        >
          Next
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </footer>
    </div>
  );
}
