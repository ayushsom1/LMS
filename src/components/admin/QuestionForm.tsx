'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MCQOption, TestCase, Question } from '@/types';
import Toast, { useToast } from '@/components/Toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Check, Plus, X } from 'lucide-react';

interface QuestionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (question: {
    type: 'mcq' | 'coding';
    title: string;
    description: string;
    options?: MCQOption[];
    correct_answer?: string;
    test_cases?: TestCase[];
    points: number;
  }) => Promise<void>;
  initialQuestion?: Question | null;
}

const defaultOptions = (): MCQOption[] => [
  { id: uuidv4(), text: '' },
  { id: uuidv4(), text: '' },
  { id: uuidv4(), text: '' },
  { id: uuidv4(), text: '' },
];

const defaultTestCases = (): TestCase[] => [
  { id: uuidv4(), input: '', expected_output: '', is_hidden: false },
];

export default function QuestionForm({ open, onClose, onSubmit, initialQuestion }: QuestionFormProps) {
  const toast = useToast();
  const [type, setType] = useState<'mcq' | 'coding'>('mcq');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(10);
  const [loading, setLoading] = useState(false);

  // MCQ state
  const [options, setOptions] = useState<MCQOption[]>(defaultOptions());
  const [correctAnswer, setCorrectAnswer] = useState('');

  // Coding state
  const [testCases, setTestCases] = useState<TestCase[]>(defaultTestCases());

  const isEditing = !!initialQuestion;

  // Populate form when editing
  useEffect(() => {
    if (initialQuestion && open) {
      setType(initialQuestion.type);
      setTitle(initialQuestion.title);
      setDescription(initialQuestion.description || '');
      setPoints(initialQuestion.points);
      if (initialQuestion.type === 'mcq') {
        if (initialQuestion.options && initialQuestion.options.length > 0) {
          // Normalize options: handle both string[] and MCQOption[] formats from DB
          const normalized = initialQuestion.options.map((o: unknown) =>
            typeof o === 'string' ? { id: uuidv4(), text: o } : { id: (o as MCQOption).id || uuidv4(), text: (o as MCQOption).text }
          );
          setOptions(normalized);
          // Map correct_answer index to option id if it's a numeric string
          const ca = initialQuestion.correct_answer || '';
          const index = parseInt(ca);
          if (!isNaN(index) && index >= 0 && index < normalized.length) {
            setCorrectAnswer(normalized[index].id);
          } else {
            // correct_answer is already an option id
            setCorrectAnswer(ca);
          }
        } else {
          setOptions(defaultOptions());
          setCorrectAnswer('');
        }
      } else {
        if (initialQuestion.test_cases && initialQuestion.test_cases.length > 0) {
          const normalized = initialQuestion.test_cases.map((tc: unknown) => ({
            id: (tc as TestCase).id || uuidv4(),
            input: (tc as TestCase).input || '',
            expected_output: (tc as TestCase).expected_output || '',
            is_hidden: (tc as TestCase).is_hidden || false,
          }));
          setTestCases(normalized);
        } else {
          setTestCases(defaultTestCases());
        }
      }
    } else if (!initialQuestion && open) {
      // Reset for "Add" mode
      setType('mcq');
      setTitle('');
      setDescription('');
      setPoints(10);
      setOptions(defaultOptions());
      setCorrectAnswer('');
      setTestCases(defaultTestCases());
    }
  }, [initialQuestion, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === 'mcq') {
        const validOptions = options.filter(o => o.text.trim());
        if (validOptions.length < 2) {
          toast.warning('Please provide at least 2 options');
          return;
        }
        if (!correctAnswer) {
          toast.warning('Please select the correct answer');
          return;
        }
        await onSubmit({
          type,
          title,
          description,
          options: validOptions,
          correct_answer: correctAnswer,
          points,
        });
      } else {
        const validTestCases = testCases.filter(tc => tc.input.trim() || tc.expected_output.trim());
        if (validTestCases.length < 1) {
          toast.warning('Please provide at least 1 test case');
          return;
        }
        await onSubmit({
          type,
          title,
          description,
          test_cases: validTestCases,
          points,
        });
      }

      onClose();
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    setOptions([...options, { id: uuidv4(), text: '' }]);
  };

  const updateOption = (id: string, text: string) => {
    setOptions(options.map(o => (o.id === id ? { ...o, text } : o)));
  };

  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter(o => o.id !== id));
      if (correctAnswer === id) setCorrectAnswer('');
    }
  };

  const addTestCase = () => {
    setTestCases([...testCases, { id: uuidv4(), input: '', expected_output: '', is_hidden: false }]);
  };

  const updateTestCase = (id: string, field: keyof TestCase, value: string | boolean) => {
    setTestCases(testCases.map(tc => (tc.id === id ? { ...tc, [field]: value } : tc)));
  };

  const removeTestCase = (id: string) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter(tc => tc.id !== id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent showCloseButton className="max-w-xl gap-0 overflow-hidden p-0">
        <Toast messages={toast.toasts} onRemove={toast.removeToast} />

        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b border-border/50">
          <DialogTitle className="text-sm font-medium">{isEditing ? 'Edit Question' : 'Add Question'}</DialogTitle>
        </DialogHeader>

        {/* Type tabs */}
        <Tabs value={type} onValueChange={(v) => setType(v as 'mcq' | 'coding')} className="px-4 pt-3">
          <TabsList className="w-full">
            <TabsTrigger value="mcq">Multiple Choice</TabsTrigger>
            <TabsTrigger value="coding">Coding (C++)</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(85vh-160px)]">
          <div className="p-4 space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="q-title">Question Title</Label>
              <Input
                id="q-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter question title"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="q-desc">Description</Label>
              <Textarea
                id="q-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter detailed description..."
                rows={3}
                className="resize-none"
                required
              />
            </div>

            {/* Points */}
            <div className="space-y-1.5">
              <Label htmlFor="q-points">Points</Label>
              <Input
                id="q-points"
                type="number"
                min={1}
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 10)}
                className="w-24"
              />
            </div>

            {/* MCQ Options */}
            {type === 'mcq' && (
              <div className="space-y-2">
                <Label>Options (select correct)</Label>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCorrectAnswer(option.id)}
                        className={cn(
                          'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                          correctAnswer === option.id
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-border hover:border-muted-foreground'
                        )}
                        aria-label={`Mark option ${index + 1} as correct`}
                      >
                        {correctAnswer === option.id && (
                          <Check className="w-3 h-3 text-white dark:text-zinc-900" strokeWidth={3} />
                        )}
                      </button>
                      <Input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateOption(option.id, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      {options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeOption(option.id)}
                          className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label="Remove option"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    className="border-dashed text-muted-foreground"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add option
                  </Button>
                </div>
              </div>
            )}

            {/* Coding Test Cases */}
            {type === 'coding' && (
              <div className="space-y-2">
                <Label>Test Cases</Label>
                <div className="space-y-3">
                  {testCases.map((tc, index) => (
                    <div key={tc.id} className="p-3 bg-card border border-border/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-mono">Case {index + 1}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tc.is_hidden}
                              onChange={(e) => updateTestCase(tc.id, 'is_hidden', e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-border bg-card accent-primary"
                            />
                            Hidden
                          </label>
                          {testCases.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => removeTestCase(tc.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-normal text-muted-foreground">Input</Label>
                          <Textarea
                            value={tc.input}
                            onChange={(e) => updateTestCase(tc.id, 'input', e.target.value)}
                            placeholder="stdin..."
                            rows={2}
                            className="bg-secondary/50 text-xs font-mono resize-none min-h-0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-normal text-muted-foreground">Expected Output</Label>
                          <Textarea
                            value={tc.expected_output}
                            onChange={(e) => updateTestCase(tc.id, 'expected_output', e.target.value)}
                            placeholder="stdout..."
                            rows={2}
                            className="bg-secondary/50 text-xs font-mono resize-none min-h-0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTestCase}
                    className="border-dashed text-muted-foreground"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add test case
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-4 py-3 border-t border-border/50 bg-card/30">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={cn(
                'flex-1',
                type === 'coding' &&
                  'bg-purple-600 hover:bg-purple-500 dark:bg-purple-500 dark:hover:bg-purple-400 text-white dark:text-zinc-900'
              )}
            >
              {loading ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Question')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
