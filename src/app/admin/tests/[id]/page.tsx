'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QuestionForm from '@/components/admin/QuestionForm';
import ThemeToggle from '@/components/ThemeToggle';
import Toast, { useToast } from '@/components/Toast';
import { Test, Question, MCQOption, TestCase, Batch } from '@/types';

function toDateTimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

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
        setStartsAt(toDateTimeLocal(testData.starts_at));
        setEndsAt(toDateTimeLocal(testData.ends_at));
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
        body: JSON.stringify({
          title,
          duration_minutes: duration,
          is_active: isActive,
          starts_at: startsAt ? new Date(startsAt).toISOString() : null,
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        }),
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
    allowed_languages?: string[];
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

  const handleExcelUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`/api/admin/tests/${id}/questions/bulk`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Imported ${data.inserted} question${data.inserted === 1 ? '' : 's'}`);
        fetchTestData();
      } else if (Array.isArray(data.errors) && data.errors.length > 0) {
        const preview = data.errors
          .slice(0, 3)
          .map((e: { row: number; message: string }) => `Row ${e.row}: ${e.message}`)
          .join(' • ');
        toast.error(`${data.error}. ${preview}${data.errors.length > 3 ? ` (+${data.errors.length - 3} more)` : ''}`, 10000);
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    }
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
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
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <span className="text-sm font-medium text-foreground">Edit Test</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={copyLink}
              className="h-8 px-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Copy Link
                </>
              )}
            </button>
            <button
              onClick={() => setShowBatchModal(true)}
              className="btn-shine h-8 px-3 flex items-center gap-1.5 text-xs text-white dark:text-zinc-900 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 rounded transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send to Batches
            </button>
            <button
              onClick={() => router.push(`/admin/tests/${id}/results`)}
              className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded transition-colors"
            >
              Results
            </button>
          </div>
        </div>
      </header>

      {/* Main - Two column layout */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left column - Test settings */}
          <div className="col-span-4 space-y-4">
            {/* Settings panel */}
            <div className="p-4 bg-card border border-border/50 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Settings</h2>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-shine h-7 px-3 bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground text-xs font-medium rounded transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-9 px-3 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Duration</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                      className="w-full h-9 px-3 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">min</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Status</label>
                  <button
                    onClick={() => setIsActive(!isActive)}
                    className={`btn-shine w-full h-9 px-3 rounded-md text-xs font-semibold transition-all border-2 ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-500/30 dark:bg-emerald-500 dark:border-emerald-400'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="p-4 bg-card border border-border/50 rounded-lg space-y-3">
              <h2 className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Schedule</h2>
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                  Available From
                </label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full h-9 px-3 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                  Available Until
                </label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full h-9 px-3 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              {(startsAt || endsAt) && (
                <button
                  type="button"
                  onClick={() => { setStartsAt(''); setEndsAt(''); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Clear schedule
                </button>
              )}
              <p className="text-[11px] text-muted-foreground">
                Leave blank for no schedule. Times use your local timezone.
              </p>
            </div>

            {/* Access code */}
            <div className="p-4 bg-card border border-border/50 rounded-lg">
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Access Code</label>
              <code className="text-2xl text-primary font-mono tracking-wider">{test.access_code}</code>
            </div>
          </div>

          {/* Right column - Questions */}
          <div className="col-span-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-foreground">
                Questions <span className="text-muted-foreground">({questions.length})</span>
              </h2>
              <div className="flex items-center gap-2">
                <a
                  href="/templates/questions-template.xlsx"
                  download
                  className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded flex items-center gap-1.5 transition-colors"
                  title="Download Excel template"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Template
                </a>
                <label
                  className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Upload questions from an Excel file"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                  Upload Excel
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        await handleExcelUpload(file);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => setShowQuestionForm(true)}
                  className="btn-shine h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
              </div>
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
                        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          q.type === 'mcq' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                        }`}>
                          {q.type}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">{q.points}pts</span>
                      </div>
                      <p className="text-sm text-foreground truncate">{q.title}</p>
                      {q.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{q.description}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => {
                          setEditingQuestion(q);
                          setShowQuestionForm(true);
                        }}
                        className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                        title="Edit question"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="Delete question"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
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
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBatchModal(false)} />
          <div className="relative w-full max-w-md bg-background border border-border/50 rounded-lg shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <h2 className="text-sm font-medium text-foreground">Send Test to Batches</h2>
              <button
                onClick={() => setShowBatchModal(false)}
                className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {batches.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">No batches created yet</p>
                  <button
                    onClick={() => router.push('/admin/batches')}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    Create a batch first
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-3">
                    Select batches to send the test invitation email to all students:
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {batches.map((batch) => (
                      <label
                        key={batch.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedBatches.includes(batch.id)
                            ? 'bg-primary/10 border-primary/50'
                            : 'bg-card border-border/50 hover:border-border'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedBatches.includes(batch.id)}
                          onChange={() => toggleBatch(batch.id)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-0 focus:ring-offset-0"
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
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setShowBatchModal(false)}
                      className="flex-1 h-9 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendToBatches}
                      disabled={sending || selectedBatches.length === 0}
                      className="btn-shine flex-1 h-9 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-zinc-900 rounded transition-colors disabled:bg-muted disabled:text-muted-foreground"
                    >
                      {sending ? 'Sending...' : `Send to ${selectedBatches.length} batch${selectedBatches.length !== 1 ? 'es' : ''}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
