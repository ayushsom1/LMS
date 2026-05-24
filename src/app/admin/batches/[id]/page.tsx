'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Batch, BatchStudent } from '@/types';
import Toast, { useToast } from '@/components/Toast';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<BatchStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBatchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/batches/${id}`);
      if (response.ok) {
        const data = await response.json();
        setBatch(data.batch);
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Failed to fetch batch:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBatchData();
  }, [fetchBatchData]);

  const handleAddStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setAdding(true);
    try {
      const emails = emailInput
        .split(/[\n,\s]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes('@'));

      const studentsToAdd = emails.map((email) => ({ email }));

      const response = await fetch(`/api/admin/batches/${id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: studentsToAdd }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Added ${result.added} student(s) to batch`);
        setEmailInput('');
        setShowAddStudents(false);
        fetchBatchData();
      } else {
        toast.error('Failed to add students');
      }
    } catch (error) {
      console.error('Failed to add students:', error);
      toast.error('Failed to add students');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Remove this student from the batch?')) return;

    try {
      const response = await fetch(`/api/admin/batches/${id}/students?studentId=${studentId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchBatchData();
      }
    } catch (error) {
      console.error('Failed to remove student:', error);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="surface-elevated p-8 max-w-sm w-full text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20 mb-4">
            <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Batch not found</p>
          <button
            onClick={() => router.push('/admin/batches')}
            className="text-xs text-primary hover:text-primary/80 mt-3"
          >
            ← Back to batches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toast messages={toast.toasts} onRemove={toast.removeToast} />

      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border/70">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo size="sm" />
            <div className="hidden md:flex items-center gap-1.5 text-xs">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Tests
              </button>
              <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <button
                onClick={() => router.push('/admin/batches')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Batches
              </button>
              <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-foreground font-medium truncate max-w-[200px]">{batch.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="w-px h-5 bg-border mx-1" />
            <button
              onClick={() => setShowAddStudents(true)}
              className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors shadow-sm shadow-primary/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add students
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Batch detail</p>
            <h1 className="text-2xl font-semibold tracking-tight truncate">{batch.name}</h1>
            {batch.description ? (
              <p className="text-sm text-muted-foreground mt-1">{batch.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">No description.</p>
            )}
          </div>
          <div className="surface-elevated px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-md bg-primary/10 grid place-items-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Students</div>
              <div className="text-lg font-semibold tabular-nums leading-none">{students.length}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search students by name or email..."
              className="w-full h-9 pl-9 pr-3 text-sm bg-card border border-border rounded-md focus-ring transition-all"
            />
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {filteredStudents.length} of {students.length}
          </div>
        </div>

        <div className="surface-elevated overflow-hidden">
          {students.length === 0 ? (
            <div className="text-center py-20 px-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">No students in this batch yet</h3>
              <p className="text-xs text-muted-foreground mb-5 max-w-xs mx-auto">
                Add students by email to assign tests to this batch.
              </p>
              <button
                onClick={() => setShowAddStudents(true)}
                className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md transition-colors shadow-sm shadow-primary/20"
              >
                Add students
              </button>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-12 gap-4 px-5 py-3 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold bg-secondary/40">
                <div className="col-span-5">Email</div>
                <div className="col-span-4">Name</div>
                <div className="col-span-2">Added</div>
                <div className="col-span-1"></div>
              </div>
              <div className="divide-y divide-border/70">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="grid grid-cols-12 gap-4 px-5 py-3 items-center hover:bg-secondary/30 transition-colors group"
                  >
                    <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 grid place-items-center text-[11px] font-semibold text-primary flex-shrink-0">
                        {(student.name?.[0] || student.email[0] || '?').toUpperCase()}
                      </div>
                      <span className="text-sm text-foreground truncate">{student.email}</span>
                    </div>
                    <div className="col-span-4 text-sm text-muted-foreground truncate">
                      {student.name || <span className="text-muted-foreground/60">—</span>}
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground tabular-nums">
                      {new Date(student.created_at).toLocaleDateString()}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        className="w-7 h-7 grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove from batch"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {showAddStudents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setShowAddStudents(false)} />
          <div className="relative w-full max-w-lg surface-elevated shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/70">
              <h2 className="text-sm font-semibold text-foreground tracking-tight">Add students</h2>
              <button
                onClick={() => setShowAddStudents(false)}
                className="w-7 h-7 grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddStudents} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Student emails</label>
                <textarea
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={'student1@example.com\nstudent2@example.com\nstudent3@example.com'}
                  rows={8}
                  className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground font-mono placeholder:text-muted-foreground focus-ring transition-colors resize-none"
                  required
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Paste one per line, or separate with commas/spaces. We&apos;ll deduplicate.
                </p>
              </div>
              <div className="flex gap-2 pt-1 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddStudents(false)}
                  className="h-9 px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="h-9 px-4 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors disabled:bg-muted shadow-sm shadow-primary/20"
                >
                  {adding ? 'Adding…' : 'Add students'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
