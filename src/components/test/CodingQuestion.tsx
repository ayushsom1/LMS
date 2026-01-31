'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Question } from '@/types';
import CodeEditor from '@/components/CodeEditor';

interface CodingQuestionProps {
  question: Question;
  questionNumber: number;
  code: string;
  onCodeChange: (code: string) => void;
}

const DEFAULT_CPP_TEMPLATE = `#include <iostream>
using namespace std;

int main() {
    // Your code here

    return 0;
}
`;

export default function CodingQuestion({
  question,
  questionNumber,
  code,
  onCodeChange,
}: CodingQuestionProps) {
  const visibleTestCases = question.test_cases?.filter(tc => !tc.is_hidden) || [];

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">Q{questionNumber}</Badge>
          <Badge className="bg-purple-600">Coding</Badge>
          <span className="text-slate-400 text-sm">{question.points} points</span>
        </div>
        <CardTitle className="text-white text-lg">{question.title}</CardTitle>
        {question.description && (
          <div className="text-slate-400 mt-2 whitespace-pre-wrap">{question.description}</div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleTestCases.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-300">Sample Test Cases:</h4>
            {visibleTestCases.map((tc, index) => (
              <div key={tc.id} className="grid grid-cols-2 gap-4 bg-slate-700/50 p-3 rounded-lg">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Input {index + 1}:</p>
                  <pre className="text-sm text-slate-200 font-mono bg-slate-800 p-2 rounded">
                    {tc.input || '(empty)'}
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Expected Output:</p>
                  <pre className="text-sm text-slate-200 font-mono bg-slate-800 p-2 rounded">
                    {tc.expected_output}
                  </pre>
                </div>
              </div>
            ))}
            {question.test_cases && question.test_cases.some(tc => tc.is_hidden) && (
              <p className="text-xs text-slate-500">
                + {question.test_cases.filter(tc => tc.is_hidden).length} hidden test case(s)
              </p>
            )}
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Your Solution (C++):</h4>
          <CodeEditor
            value={code || DEFAULT_CPP_TEMPLATE}
            onChange={onCodeChange}
            height="350px"
          />
        </div>
      </CardContent>
    </Card>
  );
}
