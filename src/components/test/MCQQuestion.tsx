'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Question } from '@/types';

interface MCQQuestionProps {
  question: Question;
  questionNumber: number;
  selectedAnswer: string;
  onAnswerChange: (answer: string) => void;
}

export default function MCQQuestion({
  question,
  questionNumber,
  selectedAnswer,
  onAnswerChange,
}: MCQQuestionProps) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">Q{questionNumber}</Badge>
          <Badge>MCQ</Badge>
          <span className="text-slate-400 text-sm">{question.points} points</span>
        </div>
        <CardTitle className="text-white text-lg">{question.title}</CardTitle>
        {question.description && (
          <p className="text-slate-400 mt-2 whitespace-pre-wrap">{question.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedAnswer} onValueChange={onAnswerChange}>
          <div className="space-y-3">
            {question.options?.map((option) => (
              <div
                key={option.id}
                className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  selectedAnswer === option.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
                }`}
                onClick={() => onAnswerChange(option.id)}
              >
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="text-slate-200 cursor-pointer flex-1">
                  {option.text}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
