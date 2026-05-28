'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QuestionForm from '@/components/admin/QuestionForm';
import ThemeToggle from '@/components/ThemeToggle';
import Toast, { useToast } from '@/components/Toast';
import { Test, Question, MCQOption, TestCase, Batch } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ArrowLeft, Check, Link2, Mail, Pencil, Plus, Trash2, Users } from 'lucide-react';

export default function EditTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [isActive, setIsActive] = useState(true);

  // Batch state
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchTestData = useCallback(async () => {
    try {
      const [testRes, questionsRes] = await Promise.all([
        fetch(`/api/admin/tests/${id}`),
        fetch(`/api/admin/tests/${id}/questions`),
      ]);

      if (testRes.ok) {
        const testData = await testRes.json();
        setTest(testData);
        setTitle(testData.title);
        setDuration(testData.duration_minutes);
        setIsActive(testData.is_active);
      }

      if (questionsRes.ok) {
        const questionsData = await questionsRes.json();
        setQuestions(questionsData);
      }
    } catch (error) {
      console.error('Failed to fetch test data:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchBatches = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/batches');
      if (response.ok) {
        const data = await response.json();
        setBatches(data);
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  }, []);

  useEffect(() => {
    fetchTestData();
    fetchBatches();
  }, [fetchTestData, fetchBatches]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/tests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, duration_minutes: duration, is_active: isActive }),
      });
      if (response.ok) {
        const updated = await response.json();
        setTest(updated);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionSubmit = async (questionData: {
    type: 'mcq' | 'coding';
    title: string;
    description: string;
    options?: MCQOption[];
    correct_answer?: string;
    test_cases?: TestCase[];
    points: number;
  }) => {
    if (editingQuestion) {
      // Update existing question
      const response = await fetch(`/api/admin/tests/${id}/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...questionData, order_index: editingQuestion.order_index }),
      });
      if (response.ok) {
        fetchTestData();
      }
    } else {
      // Create new question
      const response = await fetch(`/api/admin/tests/${id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...questionData, order_index: questions.length }),
      });
      if (response.ok) {
        fetchTestData();
      }
    }
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return;
    const response = await fetch(`/api/admin/tests/${id}/questions/${questionId}`, { method: 'DELETE' });
    if (response.ok) {
      setQuestions(questions.filter(q => q.id !== questionId));
    }
  };

  const copyLink = async () => {
    if (test) {
      await navigator.clipboard.writeText(`${window.location.origin}/test/${test.access_code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendToBatches = async () => {
    if (selectedBatches.length === 0) {
      toast.warning('Please select at least one batch');
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/admin/tests/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_ids: selectedBatches }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Test sent to ${result.sent} student(s)${result.failed > 0 ? ` (${result.failed} failed)` : ''}`);
        setShowBatchModal(false);
        setSelectedBatches([]);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send test');
      }
    } catch (error) {
      console.error('Failed to send test:', error);
      toast.error('Failed to send test');
    } finally {
      setSending(false);
    }
  };

  const toggleBatch = (batchId: string) => {
    setSelectedBatches((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/50">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center">
            <Skeleton className="h-5 w-24" />
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4 space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
            <div className="col-span-8 space-y-2">
              <Skeleton className="h-8 w-40" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Test not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toast messages={toast.toasts} onRemove={toast.removeToast} />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => router.push('/admin/dashboard')}
              className="text-muted-foreground"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-foreground">Edit Test</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="secondary" size="sm" onClick={copyLink}>
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Copied
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  Copy Link
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => setShowBatchModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-zinc-900"
            >
              <Mail className="w-3.5 h-3.5" />
              Send to Batches
            </Button>
            <Button variant="secondary" size="sm" onClick={() => router.push(`/admin/tests/${id}/results`)}>
              Results
            </Button>
          </div>
        </div>
      </header>

      {/* Main - Two column layout */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left column - Test settings */}
          <div className="col-span-4 space-y-4">
            {/* Settings panel */}
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Settings</h2>
                  <Button size="xs" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-duration">Duration</Label>
                    <div className="relative">
                      <Input
                        id="edit-duration"
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                        className="pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">min</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Button
                      type="button"
                      onClick={() => setIsActive(!isActive)}
                      variant={isActive ? 'outline' : 'secondary'}
                      className={isActive ? 'w-full border-emerald-500/30 bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 dark:text-emerald-400' : 'w-full'}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Access code */}
            <Card>
              <CardContent>
                <Label className="mb-2 block text-[10px] uppercase tracking-wider">Access Code</Label>
                <code className="text-2xl text-primary font-mono tracking-wider">{test.access_code}</code>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Questions */}
          <div className="col-span-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-foreground">
                Questions <span className="text-muted-foreground">({questions.length})</span>
              </h2>
              <Button size="sm" onClick={() => setShowQuestionForm(true)}>
                <Plus className="w-3.5 h-3.5" />
                Add
              </Button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-16 bg-secondary/30 border border-border/30 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">No questions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.sort((a, b) => a.order_index - b.order_index).map((q, i) => (
                  <div
                    key={q.id}
                    className="group flex items-start gap-3 p-3 bg-card hover:bg-secondary/50 border border-border/50 rounded-lg transition-colors"
                  >
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-secondary text-[10px] text-muted-foreground font-mono">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            'rounded text-[10px] uppercase tracking-wider border-transparent',
                            q.type === 'mcq'
                              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                              : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                          )}
                        >
                          {q.type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">{q.points}pts</span>
                      </div>
                      <p className="text-sm text-foreground truncate">{q.title}</p>
                      {q.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{q.description}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditingQuestion(q);
                          setShowQuestionForm(true);
                        }}
                        className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                        title="Edit question"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <QuestionForm
        open={showQuestionForm}
        onClose={() => {
          setShowQuestionForm(false);
          setEditingQuestion(null);
        }}
        onSubmit={handleQuestionSubmit}
        initialQuestion={editingQuestion}
      />

      {/* Send to Batches Modal */}
      <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Send Test to Batches</DialogTitle>
            {batches.length > 0 && (
              <DialogDescription className="text-xs">
                Select batches to send the test invitation email to all students:
              </DialogDescription>
            )}
          </DialogHeader>
          {batches.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-secondary border border-border mb-4">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">No batches created yet</p>
              <Button variant="link" size="sm" onClick={() => router.push('/admin/batches')}>
                Create a batch first
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {batches.map((batch) => (
                  <label
                    key={batch.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      selectedBatches.includes(batch.id)
                        ? 'bg-primary/10 border-primary/50'
                        : 'bg-card border-border/50 hover:border-border'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBatches.includes(batch.id)}
                      onChange={() => toggleBatch(batch.id)}
                      className="size-4 rounded border-border accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{batch.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {batch.student_count || 0} student{(batch.student_count || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowBatchModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSendToBatches}
                  disabled={sending || selectedBatches.length === 0}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-zinc-900"
                >
                  {sending ? 'Sending...' : `Send to ${selectedBatches.length} batch${selectedBatches.length !== 1 ? 'es' : ''}`}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
