'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';
import { MCQOption, TestCase } from '@/types';

interface QuestionWithResult {
  id: string;
  type: 'mcq' | 'coding';
  title: string;
  description: string | null;
  options: MCQOption[] | null;
  correct_answer?: string;
  student_correct?: boolean;
  test_cases: TestCase[] | null;
  points: number;
  order_index: number;
}

interface SubmissionDetail {
  id: string;
  test_id: string;
  student_name: string;
  student_email: string;
  answers: Record<string, string>;
  mcq_score: number;
  coding_score: number;
  total_score: number;
  status: string;
  submitted_at: string | null;
  started_at: string | null;
  violations: Array<{ type: string; timestamp: string; message: string }>;
  violation_count: number;
  auto_submitted: boolean;
}

interface TestDetail {
  id: string;
  title: string;
  duration_minutes: number;
}

export default function StudentResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [test, setTest] = useState<TestDetail | null>(null);
  const [questions, setQuestions] = useState<QuestionWithResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login?next=/student/dashboard');
        return;
      }

      const response = await fetch(`/api/student/submissions/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSubmission(data.submission);
        setTest(data.test);
        setQuestions(data.questions || []);
      } else {
        router.push('/student/dashboard');
      }
    } catch {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!submission || !test) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Result not found</p>
      </div>
    );
  }

  const maxPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const percentage = maxPoints > 0 ? Math.round((submission.total_score / maxPoints) * 100) : 0;
  const mcqQuestions = questions.filter((q) => q.type === 'mcq');
  const codingQuestions = questions.filter((q) => q.type === 'coding');
  const mcqCorrect = mcqQuestions.filter((q) => q.student_correct).length;
  const mcqAttempted = mcqQuestions.filter((q) => submission.answers[q.id]).length;
  const codingAttempted = codingQuestions.filter((q) => submission.answers[q.id]).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/student/dashboard')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <span className="text-sm font-medium text-foreground">Results</span>
              <span className="text-xs text-muted-foreground ml-2 font-mono">/ {test.title}</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Score Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="p-4 bg-card border border-border/50 rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">MCQ Score</p>
            <p className="text-2xl font-mono text-foreground">{submission.mcq_score}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{mcqCorrect}/{mcqAttempted} correct</p>
          </div>
          <div className="p-4 bg-card border border-border/50 rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Coding Score</p>
            <p className="text-2xl font-mono text-foreground">{submission.coding_score}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{codingAttempted}/{codingQuestions.length} attempted</p>
          </div>
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-[10px] text-primary uppercase tracking-wider mb-1">Total Score</p>
            <p className="text-2xl font-mono text-primary font-semibold">
              {submission.total_score}<span className="text-sm text-primary/70">/{maxPoints}</span>
            </p>
          </div>
          <div className={`p-4 border rounded-lg ${
            percentage >= 70 ? 'bg-emerald-500/10 border-emerald-500/30' :
            percentage >= 40 ? 'bg-amber-500/10 border-amber-500/30' :
            'bg-destructive/10 border-destructive/30'
          }`}>
            <p className={`text-[10px] uppercase tracking-wider mb-1 ${
              percentage >= 70 ? 'text-emerald-600 dark:text-emerald-400' :
              percentage >= 40 ? 'text-amber-600 dark:text-amber-400' :
              'text-destructive'
            }`}>Percentage</p>
            <p className={`text-2xl font-mono font-semibold ${
              percentage >= 70 ? 'text-emerald-600 dark:text-emerald-400' :
              percentage >= 40 ? 'text-amber-600 dark:text-amber-400' :
              'text-destructive'
            }`}>{percentage}%</p>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-muted-foreground">
          {submission.submitted_at && (
            <span>Submitted: {formatDate(submission.submitted_at)}</span>
          )}
          {submission.auto_submitted && (
            <span className="text-destructive">Auto-submitted due to violations</span>
          )}
          {(submission.violation_count || 0) > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              {submission.violation_count} violation{submission.violation_count > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Question Analysis */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
            Question Analysis
            <span className="text-xs text-muted-foreground font-mono">({questions.length} questions)</span>
          </h2>

          {questions
            .sort((a, b) => a.order_index - b.order_index)
            .map((question, index) => {
              const answer = submission.answers[question.id];
              const isAttempted = !!answer;
              const isMCQ = question.type === 'mcq';

              return (
                <div
                  key={question.id}
                  className={`p-4 border rounded-lg ${
                    !isAttempted
                      ? 'bg-secondary/30 border-border/30'
                      : isMCQ
                      ? question.student_correct
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-destructive/5 border-destructive/30'
                      : 'bg-card border-border/50'
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-secondary text-[10px] text-muted-foreground font-mono">
                        {index + 1}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${
                        question.type === 'mcq' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                      }`}>
                        {question.type}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">{question.points} pts</span>
                    </div>
                    <div>
                      {!isAttempted ? (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                          Not Attempted
                        </span>
                      ) : isMCQ ? (
                        question.student_correct ? (
                          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Correct
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-destructive/20 text-destructive">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Wrong
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400">
                          Submitted
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Title */}
                  <h3 className="text-sm font-medium text-foreground mb-1">{question.title}</h3>
                  {question.description && (
                    <p className="text-xs text-muted-foreground mb-3 whitespace-pre-wrap">{question.description}</p>
                  )}

                  {/* MCQ Options */}
                  {isMCQ && question.options && (
                    <div className="space-y-1.5 mt-3">
                      {question.options.map((rawOption: MCQOption | string, optionIndex: number) => {
                        // Legacy rows may store options as plain strings; the take-page uses the
                        // string itself as the answer key, so mirror that here for `isSelected` to match.
                        const option: MCQOption =
                          typeof rawOption === 'string'
                            ? { id: rawOption, text: rawOption }
                            : { id: rawOption.id ?? String(optionIndex), text: rawOption.text };

                        const isSelected = answer != null && answer === option.id;
                        const isCorrectOption = question.student_correct && isSelected;
                        // Only highlight as correct when the API actually revealed the correct answer.
                        const showAsCorrect =
                          question.correct_answer != null && option.id === question.correct_answer;

                        return (
                          <div
                            key={`${question.id}-${option.id}-${optionIndex}`}
                            className={`flex items-center gap-2 p-2 rounded text-sm ${
                              showAsCorrect
                                ? 'bg-emerald-500/10 border border-emerald-500/30'
                                : isSelected
                                ? 'bg-destructive/10 border border-destructive/30'
                                : 'bg-secondary/50 border border-transparent'
                            }`}
                          >
                            <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              showAsCorrect
                                ? 'border-emerald-500 bg-emerald-500'
                                : isSelected
                                ? 'border-destructive bg-destructive'
                                : 'border-border'
                            }`}>
                              {(showAsCorrect || isSelected) && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  {showAsCorrect ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  )}
                                </svg>
                              )}
                            </div>
                            <span className={`flex-1 ${
                              showAsCorrect ? 'text-emerald-700 dark:text-emerald-300' :
                              isSelected ? 'text-destructive' : 'text-muted-foreground'
                            }`}>
                              {option.text}
                            </span>
                            {showAsCorrect && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Correct</span>
                            )}
                            {isSelected && !isCorrectOption && (
                              <span className="text-[10px] text-destructive">Your Answer</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Coding: show student's code */}
                  {question.type === 'coding' && (
                    <div className="mt-3 space-y-3">
                      {/* Visible test cases */}
                      {question.test_cases && question.test_cases.filter(tc => !tc.is_hidden).length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Test Cases</p>
                          <div className="grid gap-2">
                            {question.test_cases.filter(tc => !tc.is_hidden).map((tc, i) => (
                              <div key={tc.id ?? `${question.id}-tc-${i}`} className="p-2 bg-secondary/50 border border-border/50 rounded text-xs">
                                <span className="text-muted-foreground">Case {i + 1}</span>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <div>
                                    <p className="text-[10px] text-muted-foreground mb-0.5">Input</p>
                                    <pre className="text-foreground font-mono bg-background/50 p-1.5 rounded overflow-x-auto">{tc.input || '(empty)'}</pre>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground mb-0.5">Expected</p>
                                    <pre className="text-foreground font-mono bg-background/50 p-1.5 rounded overflow-x-auto">{tc.expected_output}</pre>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Hidden test cases indicator */}
                      {question.test_cases && question.test_cases.filter(tc => tc.is_hidden).length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          + {question.test_cases.filter(tc => tc.is_hidden).length} hidden test case(s)
                        </p>
                      )}

                      {/* Student's code */}
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Your Code</p>
                        {answer ? (
                          <pre className="p-3 bg-zinc-900 dark:bg-zinc-950 border border-border/50 rounded-lg text-xs text-zinc-100 font-mono overflow-x-auto max-h-64 overflow-y-auto">
                            {answer}
                          </pre>
                        ) : (
                          <p className="text-xs text-muted-foreground italic p-3 bg-secondary/30 rounded-lg">
                            No code submitted
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </main>
    </div>
  );
}
