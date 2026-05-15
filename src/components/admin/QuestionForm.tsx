'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MCQOption, TestCase, Question } from '@/types';
import Toast, { useToast } from '@/components/Toast';

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <Toast messages={toast.toasts} onRemove={toast.removeToast} />

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl max-h-[85vh] overflow-hidden bg-background border border-border/50 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h2 className="text-sm font-medium text-foreground">{isEditing ? 'Edit Question' : 'Add Question'}</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Type tabs */}
        <div className="flex border-b border-border/50">
          <button
            type="button"
            onClick={() => setType('mcq')}
            className={`flex-1 h-10 text-xs font-medium transition-colors ${
              type === 'mcq'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Multiple Choice
          </button>
          <button
            type="button"
            onClick={() => setType('coding')}
            className={`flex-1 h-10 text-xs font-medium transition-colors ${
              type === 'coding'
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-500 bg-purple-500/5'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Coding (C++)
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(85vh-120px)]">
          <div className="p-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">
                Question Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter question title"
                className="w-full h-9 px-3 bg-card border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter detailed description..."
                rows={3}
                className="w-full px-3 py-2 bg-card border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none"
                required
              />
            </div>

            {/* Points */}
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">
                Points
              </label>
              <input
                type="number"
                min={1}
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 10)}
                className="w-24 h-9 px-3 bg-card border border-border rounded text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* MCQ Options */}
            {type === 'mcq' && (
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">
                  Options (select correct)
                </label>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCorrectAnswer(option.id)}
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          correctAnswer === option.id
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-border hover:border-muted-foreground'
                        }`}
                      >
                        {correctAnswer === option.id && (
                          <svg className="w-3 h-3 text-white dark:text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateOption(option.id, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 h-9 px-3 bg-card border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(option.id)}
                          className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOption}
                    className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-muted-foreground rounded transition-colors"
                  >
                    + Add option
                  </button>
                </div>
              </div>
            )}

            {/* Coding Test Cases */}
            {type === 'coding' && (
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">
                  Test Cases
                </label>
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
                              className="w-3.5 h-3.5 rounded border-border bg-card text-primary focus:ring-0 focus:ring-offset-0"
                            />
                            Hidden
                          </label>
                          {testCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTestCase(tc.id)}
                              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-muted-foreground mb-1">Input</label>
                          <textarea
                            value={tc.input}
                            onChange={(e) => updateTestCase(tc.id, 'input', e.target.value)}
                            placeholder="stdin..."
                            rows={2}
                            className="w-full px-2 py-1.5 bg-secondary/50 border border-border/50 rounded text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-muted-foreground mb-1">Expected Output</label>
                          <textarea
                            value={tc.expected_output}
                            onChange={(e) => updateTestCase(tc.id, 'expected_output', e.target.value)}
                            placeholder="stdout..."
                            rows={2}
                            className="w-full px-2 py-1.5 bg-secondary/50 border border-border/50 rounded text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addTestCase}
                    className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-muted-foreground rounded transition-colors"
                  >
                    + Add test case
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-4 py-3 border-t border-border/50 bg-card/30">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 h-9 text-xs font-medium rounded transition-colors ${
                type === 'mcq'
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  : 'bg-purple-600 hover:bg-purple-500 dark:bg-purple-500 dark:hover:bg-purple-400 text-white dark:text-zinc-900'
              } disabled:bg-muted disabled:text-muted-foreground`}
            >
              {loading ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Question')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
