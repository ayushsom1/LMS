'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Batch } from '@/types';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';

export default function BatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDesc, setNewBatchDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchBatches = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/batches');
      if (response.ok) {
        const data = await response.json();
        setBatches(data);
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBatchName, description: newBatchDesc }),
      });

      if (response.ok) {
        setNewBatchName('');
        setNewBatchDesc('');
        setShowCreate(false);
        fetchBatches();
      }
    } catch (error) {
      console.error('Failed to create batch:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBatch = async (id: string) => {
    if (!confirm('Delete this batch? This will not delete the students, only the batch grouping.')) return;

    try {
      const response = await fetch(`/api/admin/batches/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchBatches();
      }
    } catch (error) {
      console.error('Failed to delete batch:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="h-14 px-6 flex items-center border-b border-border/50 bg-card/50">
          <Skeleton className="h-5 w-40" />
        </header>
        <main className="max-w-4xl mx-auto px-6 py-6 grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push('/admin/dashboard')}
            className="text-muted-foreground"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Student Batches</h1>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          New Batch
        </Button>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-6">
        {batches.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-secondary flex items-center justify-center">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">No batches created yet</p>
            <Button variant="link" onClick={() => setShowCreate(true)}>
              Create your first batch
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {batches.map((batch) => (
              <Card key={batch.id} className="py-0 hover:border-border transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-medium text-foreground truncate">{batch.name}</h3>
                        <Badge variant="secondary" className="rounded">
                          {batch.student_count || 0} students
                        </Badge>
                      </div>
                      {batch.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{batch.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="secondary" size="sm" onClick={() => router.push(`/admin/batches/${batch.id}`)}>
                        Manage
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteBatch(batch.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label="Delete batch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Batch Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBatch} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="batchName" className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Batch Name
              </Label>
              <Input
                id="batchName"
                type="text"
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                placeholder="e.g., Batch 2024-A"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="batchDesc" className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Description (optional)
              </Label>
              <Input
                id="batchDesc"
                type="text"
                value={newBatchDesc}
                onChange={(e) => setNewBatchDesc(e.target.value)}
                placeholder="e.g., Computer Science students"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create Batch'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
