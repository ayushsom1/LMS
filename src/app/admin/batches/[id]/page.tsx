'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Batch, BatchStudent } from '@/types';
import Toast, { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, UserPlus, Users, X, Loader2 } from 'lucide-react';

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
      <div className="min-h-screen bg-background">
        <div className="h-14 px-6 flex items-center justify-between border-b border-border/50 bg-card/50">
          <div className="flex items-center gap-4">
            <Skeleton className="size-5 rounded-md" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <main className="max-w-4xl mx-auto px-6 py-6 space-y-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </main>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Batch not found</p>
        <Button variant="link" size="sm" onClick={() => router.push('/admin/batches')}>
          <ArrowLeft className="size-3.5" /> Back to batches
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toast messages={toast.toasts} onRemove={toast.removeToast} />

      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push('/admin/batches')}
            className="text-muted-foreground"
            aria-label="Back to batches"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">{batch.name}</h1>
            {batch.description && (
              <p className="text-xs text-muted-foreground">{batch.description}</p>
            )}
          </div>
        </div>
        <Button onClick={() => setShowAddStudents(true)}>
          <UserPlus className="size-4" />
          Add Students
        </Button>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* Search */}
        <div className="mb-4">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search students..."
            className="max-w-xs"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm text-muted-foreground">
            {students.length} student{students.length !== 1 ? 's' : ''} in batch
          </span>
        </div>

        {students.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">No students in this batch</p>
            <Button variant="outline" size="sm" onClick={() => setShowAddStudents(true)}>
              <UserPlus className="size-3.5" />
              Add students
            </Button>
          </div>
        ) : (
          <Card className="py-0 overflow-hidden gap-0">
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
                  <tr key={student.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground">{student.email}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{student.name || '-'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                      {new Date(student.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveStudent(student.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Remove ${student.email}`}
                      >
                        <X className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </main>

      {/* Add Students Modal */}
      <Dialog open={showAddStudents} onOpenChange={setShowAddStudents}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Students</DialogTitle>
            <DialogDescription>
              Paste email addresses — one per line, or comma/space separated.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStudents} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="emails" className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Student Emails
              </Label>
              <Textarea
                id="emails"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={"student1@example.com\nstudent2@example.com\nstudent3@example.com"}
                rows={8}
                className="font-mono resize-none"
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Tip: You can paste a list of emails from a spreadsheet.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowAddStudents(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={adding}>
                {adding ? <><Loader2 className="size-4 animate-spin" />Adding…</> : 'Add Students'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
