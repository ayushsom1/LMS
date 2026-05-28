'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, cn } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';
import { MCQOption, TestCase } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Check, X, FileX } from 'lucide-react';

type StoredAnswer = string | { code: string; language: string } | null | undefined;

function getCodeString(answer: StoredAnswer): string {
  if (!answer) return '';
  if (typeof answer === 'string') return answer;
  if (typeof answer === 'object' && 'code' in answer && typeof answer.code === 'string') return answer.code;
  return '';
}

function getCodeLanguage(answer: StoredAnswer): string | null {
  if (answer && typeof answer === 'object' && 'language' in answer && typeof answer.language === 'string') {
    return answer.language;
  }
  return null;
}

function isAnswerAttempted(answer: StoredAnswer): boolean {
  if (!answer) return false;
  if (typeof answer === 'string') return answer.length > 0;
  if (typeof answer === 'object' && 'code' in answer) return typeof answer.code === 'string' && answer.code.length > 0;
  return false;
}

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
  answers: Record<string, string | { code: string; language: string } | null>;
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
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/50">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-48" />
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[92px] rounded-lg" />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!submission || !test) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-secondary border border-border mb-4">
            <FileX className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-muted-foreground mb-4">Result not found</p>
          <Button variant="outline" size="sm" onClick={() => router.push('/student/dashboard')}>
            <ArrowLeft />
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  const maxPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const percentage = maxPoints > 0 ? Math.round((submission.total_score / maxPoints) * 100) : 0;
  const mcqQuestions = questions.filter((q) => q.type === 'mcq');
  const codingQuestions = questions.filter((q) => q.type === 'coding');
  const mcqCorrect = mcqQuestions.filter((q) => q.student_correct).length;
  const mcqAttempted = mcqQuestions.filter((q) => isAnswerAttempted(submission.answers[q.id])).length;
  const codingAttempted = codingQuestions.filter((q) => isAnswerAttempted(submission.answers[q.id])).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => router.push('/student/dashboard')}
              className="text-muted-foreground"
            >
              <ArrowLeft />
            </Button>
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
          <Card className="py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">MCQ Score</p>
              <p className="text-2xl font-mono text-foreground">{submission.mcq_score}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{mcqCorrect}/{mcqAttempted} correct</p>
            </CardContent>
          </Card>
          <Card className="py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Coding Score</p>
              <p className="text-2xl font-mono text-foreground">{submission.coding_score}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{codingAttempted}/{codingQuestions.length} attempted</p>
            </CardContent>
          </Card>
          <Card className="py-0 gap-0 bg-primary/10 border-primary/30">
            <CardContent className="p-4">
              <p className="text-[10px] text-primary uppercase tracking-wider mb-1">Total Score</p>
              <p className="text-2xl font-mono text-primary font-semibold">
                {submission.total_score}<span className="text-sm text-primary/70">/{maxPoints}</span>
              </p>
            </CardContent>
          </Card>
          <Card
            className={cn(
              'py-0 gap-0',
              percentage >= 70
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : percentage >= 40
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-destructive/10 border-destructive/30'
            )}
          >
            <CardContent className="p-4">
              <p
                className={cn(
                  'text-[10px] uppercase tracking-wider mb-1',
                  percentage >= 70
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : percentage >= 40
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-destructive'
                )}
              >
                Percentage
              </p>
              <p
                className={cn(
                  'text-2xl font-mono font-semibold mb-2',
                  percentage >= 70
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : percentage >= 40
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-destructive'
                )}
              >
                {percentage}%
              </p>
              <div className="w-full h-1 bg-secondary/60 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    percentage >= 70 ? 'bg-emerald-500' : percentage >= 40 ? 'bg-amber-500' : 'bg-destructive'
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-muted-foreground">
          {submission.submitted_at && (
            <span>Submitted: {formatDate(submission.submitted_at)}</span>
          )}
          {submission.auto_submitted && (
            <Badge variant="destructive" className="text-[10px]">Auto-submitted due to violations</Badge>
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
              const isAttempted = isAnswerAttempted(answer);
              const mcqAnswerId = typeof answer === 'string' ? answer : null;
              const codeText = getCodeString(answer);
              const codeLang = getCodeLanguage(answer);
              const isMCQ = question.type === 'mcq';

              return (
                <Card
                  key={question.id}
                  className={cn(
                    'py-0 gap-0',
                    !isAttempted
                      ? 'bg-secondary/30 border-border/30'
                      : isMCQ
                      ? question.student_correct
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-destructive/5 border-destructive/30'
                      : 'bg-card border-border/50'
                  )}
                >
                  <CardContent className="p-4">
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-secondary text-[10px] text-muted-foreground font-mono">
                        {index + 1}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'uppercase tracking-wider rounded',
                          question.type === 'mcq'
                            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                            : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                        )}
                      >
                        {question.type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">{question.points} pts</span>
                    </div>
                    <div>
                      {!isAttempted ? (
                        <Badge variant="secondary" className="uppercase tracking-wider rounded text-muted-foreground">
                          Not Attempted
                        </Badge>
                      ) : isMCQ ? (
                        question.student_correct ? (
                          <Badge className="uppercase tracking-wider rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            <Check />
                            Correct
                          </Badge>
                        ) : (
                          <Badge className="uppercase tracking-wider rounded bg-destructive/20 text-destructive">
                            <X />
                            Wrong
                          </Badge>
                        )
                      ) : (
                        <Badge className="uppercase tracking-wider rounded bg-purple-500/20 text-purple-600 dark:text-purple-400">
                          Submitted
                        </Badge>
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

                        const isSelected = mcqAnswerId != null && mcqAnswerId === option.id;
                        const isCorrectOption = question.student_correct && isSelected;
                        // Only highlight as correct when the API actually revealed the correct answer.
                        const showAsCorrect =
                          question.correct_answer != null && option.id === question.correct_answer;

                        return (
                          <div
                            key={`${question.id}-${option.id}-${optionIndex}`}
                            className={cn(
                              'flex items-center gap-2 p-2 rounded text-sm',
                              showAsCorrect
                                ? 'bg-emerald-500/10 border border-emerald-500/30'
                                : isSelected
                                ? 'bg-destructive/10 border border-destructive/30'
                                : 'bg-secondary/50 border border-transparent'
                            )}
                          >
                            <div
                              className={cn(
                                'flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center',
                                showAsCorrect
                                  ? 'border-emerald-500 bg-emerald-500'
                                  : isSelected
                                  ? 'border-destructive bg-destructive'
                                  : 'border-border'
                              )}
                            >
                              {showAsCorrect ? (
                                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                              ) : isSelected ? (
                                <X className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                              ) : null}
                            </div>
                            <span
                              className={cn(
                                'flex-1',
                                showAsCorrect
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : isSelected
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                              )}
                            >
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
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                          Your Code{codeLang ? <span className="ml-2 normal-case text-muted-foreground/70">({codeLang})</span> : null}
                        </p>
                        {codeText ? (
                          <pre className="p-3 bg-zinc-900 dark:bg-zinc-950 border border-border/50 rounded-lg text-xs text-zinc-100 font-mono overflow-x-auto max-h-64 overflow-y-auto">
                            {codeText}
                          </pre>
                        ) : (
                          <p className="text-xs text-muted-foreground italic p-3 bg-secondary/30 rounded-lg">
                            No code submitted
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </main>
    </div>
  );
}
