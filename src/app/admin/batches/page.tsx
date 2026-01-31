'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Batch } from '@/types';

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-foreground">Student Batches</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Batch
        </button>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-6">
        {batches.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-secondary flex items-center justify-center">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-muted-foreground mb-4">No batches created yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-sm text-primary hover:text-primary/80"
            >
              Create your first batch
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="p-4 bg-card border border-border/50 rounded-lg hover:border-border transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-medium text-foreground truncate">{batch.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                        {batch.student_count || 0} students
                      </span>
                    </div>
                    {batch.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{batch.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => router.push(`/admin/batches/${batch.id}`)}
                      className="h-8 px-3 text-xs text-foreground bg-secondary hover:bg-secondary/80 rounded transition-colors"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => handleDeleteBatch(batch.id)}
                      className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Batch Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md bg-background border border-border/50 rounded-lg shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <h2 className="text-sm font-medium text-foreground">Create New Batch</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateBatch} className="p-4 space-y-4">
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">
                  Batch Name
                </label>
                <input
                  type="text"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g., Batch 2024-A"
                  className="w-full h-9 px-3 bg-card border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newBatchDesc}
                  onChange={(e) => setNewBatchDesc(e.target.value)}
                  placeholder="e.g., Computer Science students"
                  className="w-full h-9 px-3 bg-card border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 h-9 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 h-9 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors disabled:bg-muted"
                >
                  {creating ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
