'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Test, Question, Submission, MCQOption, TestCase } from '@/types';
import { formatDate, cn } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertTriangle, Check, X } from 'lucide-react';

interface DetailedSubmission extends Submission {
  answers: Record<string, string>;
}

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id, submissionId } = use(params);
  const router = useRouter();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submission, setSubmission] = useState<DetailedSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [testRes, questionsRes, submissionRes] = await Promise.all([
        fetch(`/api/admin/tests/${id}`),
        fetch(`/api/admin/tests/${id}/questions`),
        fetch(`/api/admin/tests/${id}/submissions/${submissionId}`),
      ]);

      if (testRes.ok) setTest(await testRes.json());
      if (questionsRes.ok) setQuestions(await questionsRes.json());
      if (submissionRes.ok) setSubmission(await submissionRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [id, submissionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getOptionById = (options: MCQOption[], optionId: string) => {
    return options.find((o) => o.id === optionId);
  };

  const isCorrectMCQ = (question: Question, answer: string) => {
    return answer === question.correct_answer;
  };

  const getTestCaseResults = (question: Question, code: string) => {
    // For now, we show test cases without actual execution results
    // In production, you'd store the execution results in the submission
    return question.test_cases || [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/50">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">
            <Skeleton className="h-5 w-40" />
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!submission || !test) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Submission not found</p>
      </div>
    );
  }

  const mcqQuestions = questions.filter((q) => q.type === 'mcq');
  const codingQuestions = questions.filter((q) => q.type === 'coding');

  const mcqCorrect = mcqQuestions.filter(
    (q) => submission.answers[q.id] && isCorrectMCQ(q, submission.answers[q.id])
  ).length;
  const mcqAttempted = mcqQuestions.filter((q) => submission.answers[q.id]).length;
  const codingAttempted = codingQuestions.filter((q) => submission.answers[q.id]).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => router.push(`/admin/tests/${id}/results`)}
              className="text-muted-foreground"
              aria-label="Back to results"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <span className="text-sm font-medium text-foreground">Submission Details</span>
              <span className="text-xs text-muted-foreground ml-2 font-mono">/ {test.title}</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Student Info Card */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="py-0">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Student</p>
              <p className="text-sm font-medium text-foreground truncate">{submission.student_name}</p>
              <p className="text-xs text-muted-foreground truncate">{submission.student_email}</p>
            </CardContent>
          </Card>
          <Card className="py-0">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Submitted</p>
              <p className="text-sm font-medium text-foreground">
                {submission.submitted_at ? formatDate(submission.submitted_at) : 'In Progress'}
              </p>
              {submission.auto_submitted && (
                <span className="text-[10px] text-destructive">Auto-submitted</span>
              )}
            </CardContent>
          </Card>
          <Card className="py-0">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Score Breakdown</p>
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-muted-foreground">MCQ: <span className="text-foreground font-mono">{submission.mcq_score}</span></span>
                <span className="text-sm text-muted-foreground">Code: <span className="text-foreground font-mono">{submission.coding_score}</span></span>
              </div>
            </CardContent>
          </Card>
          <Card className="py-0 bg-primary/10 border-primary/30">
            <CardContent className="p-4">
              <p className="text-[10px] text-primary uppercase tracking-wider mb-1">Total Score</p>
              <p className="text-2xl font-mono text-primary font-semibold">{submission.total_score}</p>
            </CardContent>
          </Card>
        </div>

        {/* Violations Warning */}
        {(submission.violation_count || 0) > 0 && (
          <Alert className="mb-6 bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 [&>svg]:text-amber-500">
            <AlertTriangle />
            <AlertTitle className="text-amber-600 dark:text-amber-400">
              {submission.violation_count} Violation{(submission.violation_count || 0) > 1 ? 's' : ''} Recorded
            </AlertTitle>
            {submission.violations && submission.violations.length > 0 && (
              <AlertDescription>
                {submission.violations.map((v, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    <span className="text-amber-600 dark:text-amber-400">{v.type}</span>: {v.message}
                    <span className="text-muted-foreground/50 ml-2">
                      {new Date(v.timestamp).toLocaleTimeString()}
                    </span>
                  </p>
                ))}
              </AlertDescription>
            )}
          </Alert>
        )}

        {/* Summary Stats */}
        <div className="flex items-center gap-6 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">MCQ:</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">{mcqCorrect}</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono text-foreground">{mcqAttempted}</span>
            <span className="text-muted-foreground">attempted of {mcqQuestions.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Coding:</span>
            <span className="font-mono text-foreground">{codingAttempted}</span>
            <span className="text-muted-foreground">/ {codingQuestions.length} attempted</span>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
            <span>Question Analysis</span>
            <span className="text-xs text-muted-foreground">({questions.length} questions)</span>
          </h2>

          {questions
            .sort((a, b) => a.order_index - b.order_index)
            .map((question, index) => {
              const answer = submission.answers[question.id];
              const isAttempted = !!answer;
              const isMCQ = question.type === 'mcq';
              const isCorrect = isMCQ && answer ? isCorrectMCQ(question, answer) : null;

              return (
                <div
                  key={question.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    !isAttempted
                      ? 'bg-secondary/30 border-border/30'
                      : isMCQ
                      ? isCorrect
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
                      <Badge
                        variant="outline"
                        className={cn(
                          'rounded text-[10px] uppercase tracking-wider border-transparent',
                          question.type === 'mcq'
                            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                            : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                        )}
                      >
                        {question.type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">{question.points} pts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isAttempted ? (
                        <Badge variant="secondary" className="rounded text-[10px] uppercase tracking-wider">
                          Not Attempted
                        </Badge>
                      ) : isMCQ ? (
                        isCorrect ? (
                          <Badge variant="outline" className="rounded text-[10px] uppercase tracking-wider border-transparent bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3 h-3" />
                            Correct
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded text-[10px] uppercase tracking-wider border-transparent bg-destructive/20 text-destructive">
                            <X className="w-3 h-3" />
                            Wrong
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="rounded text-[10px] uppercase tracking-wider border-transparent bg-purple-500/20 text-purple-600 dark:text-purple-400">
                          Submitted
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Question Title & Description */}
                  <h3 className="text-sm font-medium text-foreground mb-1">{question.title}</h3>
                  {question.description && (
                    <p className="text-xs text-muted-foreground mb-3 whitespace-pre-wrap">{question.description}</p>
                  )}

                  {/* MCQ Options */}
                  {isMCQ && question.options && (
                    <div className="space-y-1.5 mt-3">
                      {question.options.map((rawOption: MCQOption | string, optionIndex: number) => {
                        const option: MCQOption =
                          typeof rawOption === 'string'
                            ? { id: rawOption, text: rawOption }
                            : { id: rawOption.id ?? String(optionIndex), text: rawOption.text };

                        const isSelected = answer != null && answer === option.id;
                        const isCorrectOption =
                          question.correct_answer != null && option.id === question.correct_answer;

                        return (
                          <div
                            key={`${question.id}-${option.id}-${optionIndex}`}
                            className={`flex items-center gap-2 p-2 rounded text-sm ${
                              isCorrectOption
                                ? 'bg-emerald-500/10 border border-emerald-500/30'
                                : isSelected
                                ? 'bg-destructive/10 border border-destructive/30'
                                : 'bg-secondary/50 border border-transparent'
                            }`}
                          >
                            <div
                              className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                isCorrectOption
                                  ? 'border-emerald-500 bg-emerald-500'
                                  : isSelected
                                  ? 'border-destructive bg-destructive'
                                  : 'border-border'
                              }`}
                            >
                              {(isCorrectOption || isSelected) && (
                                isCorrectOption ? (
                                  <Check className={cn('w-2.5 h-2.5', 'text-white dark:text-zinc-900')} strokeWidth={3} />
                                ) : (
                                  <X className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                )
                              )}
                            </div>
                            <span
                              className={`flex-1 ${
                                isCorrectOption
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : isSelected
                                  ? 'text-destructive'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {option.text}
                            </span>
                            {isCorrectOption && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Correct Answer</span>
                            )}
                            {isSelected && !isCorrectOption && (
                              <span className="text-[10px] text-destructive">Student&apos;s Answer</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Coding Answer */}
                  {question.type === 'coding' && (
                    <div className="mt-3 space-y-3">
                      {/* Test Cases */}
                      {question.test_cases && question.test_cases.length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Test Cases</p>
                          <div className="grid gap-2">
                            {question.test_cases.map((tc: TestCase, i: number) => (
                              <div
                                key={tc.id ?? `${question.id}-tc-${i}`}
                                className="p-2 bg-secondary/50 border border-border/50 rounded text-xs"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-muted-foreground">Case {i + 1}</span>
                                  {tc.is_hidden && (
                                    <Badge variant="secondary" className="rounded text-[10px]">
                                      Hidden
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-[10px] text-muted-foreground mb-0.5">Input</p>
                                    <pre className="text-foreground font-mono bg-background/50 p-1.5 rounded overflow-x-auto">
                                      {tc.input || '(empty)'}
                                    </pre>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-muted-foreground mb-0.5">Expected</p>
                                    <pre className="text-foreground font-mono bg-background/50 p-1.5 rounded overflow-x-auto">
                                      {tc.expected_output}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Student's Code */}
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                          Student&apos;s Code
                        </p>
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
