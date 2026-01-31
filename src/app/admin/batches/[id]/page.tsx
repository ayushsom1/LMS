'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Batch, BatchStudent } from '@/types';
import Toast, { useToast } from '@/components/Toast';

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
      // Parse emails (comma, newline, or space separated)
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
        <p className="text-muted-foreground">Batch not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toast messages={toast.toasts} onRemove={toast.removeToast} />

      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/batches')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{batch.name}</h1>
            {batch.description && (
              <p className="text-xs text-muted-foreground">{batch.description}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAddStudents(true)}
          className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Add Students
        </button>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search students..."
            className="w-full max-w-xs h-9 px-3 bg-card border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm text-muted-foreground">
            {students.length} student{students.length !== 1 ? 's' : ''} in batch
          </span>
        </div>

        {students.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-secondary flex items-center justify-center">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-muted-foreground mb-4">No students in this batch</p>
            <button
              onClick={() => setShowAddStudents(true)}
              className="text-sm text-primary hover:text-primary/80"
            >
              Add students
            </button>
          </div>
        ) : (
          <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    Added
                  </th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3 text-sm text-foreground">{student.email}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{student.name || '-'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(student.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-2">
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add Students Modal */}
      {showAddStudents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddStudents(false)} />
          <div className="relative w-full max-w-lg bg-background border border-border/50 rounded-lg shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <h2 className="text-sm font-medium text-foreground">Add Students</h2>
              <button
                onClick={() => setShowAddStudents(false)}
                className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddStudents} className="p-4 space-y-4">
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">
                  Student Emails
                </label>
                <textarea
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter email addresses (one per line, or comma/space separated)&#10;&#10;student1@example.com&#10;student2@example.com&#10;student3@example.com"
                  rows={8}
                  className="w-full px-3 py-2 bg-card border border-border rounded text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none"
                  required
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Tip: You can paste a list of emails from a spreadsheet
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudents(false)}
                  className="flex-1 h-9 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 h-9 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors disabled:bg-muted"
                >
                  {adding ? 'Adding...' : 'Add Students'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
