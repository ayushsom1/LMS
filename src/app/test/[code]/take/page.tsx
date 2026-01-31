'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import CodeEditor from '@/components/CodeEditor';
import { Test, Question } from '@/types';

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
      }
    } catch {
      alert('Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }, [code, answers, submitting, submitted]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
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
              <p className="text-xl font-mono text-foreground">{result.mcq_score}</p>
            </div>
            <div className="p-4 bg-card border border-border/50 rounded-lg">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Code</p>
              <p className="text-xl font-mono text-foreground">{result.coding_score}</p>
            </div>
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <p className="text-[10px] text-primary uppercase tracking-wider mb-1">Total</p>
              <p className="text-xl font-mono text-primary">{result.total_score}</p>
            </div>
          </div>

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
  const isLowTime = timeLeft < 5 * 60 * 1000; // Less than 5 minutes
  const isCriticalTime = timeLeft < 60 * 1000; // Less than 1 minute

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 h-12 px-4 flex items-center justify-between border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">{test.title}</span>
          <span className="text-xs text-muted-foreground">
            Q{currentIndex + 1}/{questions.length}
          </span>
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
                    {currentQuestion.test_cases.filter(tc => !tc.is_hidden).map((tc, i) => (
                      <div key={tc.id} className="grid grid-cols-2 gap-3 p-3 bg-card border border-border/50 rounded-lg">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Input {i + 1}</p>
                          <pre className="text-xs text-foreground font-mono bg-secondary/50 p-2 rounded overflow-x-auto">
                            {tc.input || '(empty)'}
                          </pre>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">Output</p>
                          <pre className="text-xs text-foreground font-mono bg-secondary/50 p-2 rounded overflow-x-auto">
                            {tc.expected_output}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Your Solution (C++)</p>
                <CodeEditor
                  value={answers[currentQuestion.id] || '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    \n    return 0;\n}'}
                  onChange={(code) => handleAnswerChange(currentQuestion.id, code)}
                  height="350px"
                />
              </div>
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
