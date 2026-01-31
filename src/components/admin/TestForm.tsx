'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TestFormProps {
  initialData?: {
    title: string;
    duration_minutes: number;
    is_active: boolean;
  };
  onSubmit: (data: { title: string; duration_minutes: number; is_active: boolean }) => Promise<void>;
  submitLabel?: string;
}

export default function TestForm({ initialData, onSubmit, submitLabel = 'Create Test' }: TestFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [duration, setDuration] = useState(initialData?.duration_minutes || 60);
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        title,
        duration_minutes: duration,
        is_active: isActive,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Test Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-200">Test Title</Label>
            <Input
              id="title"
              type="text"
              placeholder="Enter test title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-slate-200">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min={5}
              max={300}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-600"
            />
            <Label htmlFor="isActive" className="text-slate-200">Test is active (accepting submissions)</Label>
          </div>
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Saving...' : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
