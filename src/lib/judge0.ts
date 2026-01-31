import { Judge0Result, TestCase, TestCaseResult, CodingResult } from '@/types';

// Default to the free public Judge0 instance (rate limited but free)
// Users can self-host Judge0 or use RapidAPI for higher limits
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://ce.judge0.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';
const USE_RAPIDAPI = JUDGE0_API_URL.includes('rapidapi.com');

// C++ (GCC 9.2.0) language ID
const CPP_LANGUAGE_ID = 54;

interface SubmissionPayload {
  source_code: string;
  language_id: number;
  stdin: string;
  expected_output: string;
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Only add RapidAPI headers if using RapidAPI
  if (USE_RAPIDAPI && JUDGE0_API_KEY) {
    headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
    headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
  } else if (JUDGE0_API_KEY) {
    // For self-hosted instances that may require auth
    headers['X-Auth-Token'] = JUDGE0_API_KEY;
  }

  return headers;
}

export async function submitCode(
  sourceCode: string,
  stdin: string,
  expectedOutput: string
): Promise<string> {
  const payload: SubmissionPayload = {
    source_code: sourceCode,
    language_id: CPP_LANGUAGE_ID,
    stdin,
    expected_output: expectedOutput,
  };

  const response = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Judge0 submission failed: ${error}`);
  }

  const data = await response.json();
  return data.token;
}

export async function getSubmissionResult(token: string): Promise<Judge0Result> {
  const response = await fetch(
    `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`,
    {
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get submission result: ${error}`);
  }

  return response.json();
}

export async function waitForResult(token: string, maxAttempts = 20): Promise<Judge0Result> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getSubmissionResult(token);

    // Status IDs: 1 = In Queue, 2 = Processing
    if (result.status.id > 2) {
      return result;
    }

    // Wait 1 second before polling again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Timeout waiting for Judge0 result');
}

export async function evaluateCode(
  sourceCode: string,
  testCases: TestCase[],
  questionId: string,
  pointsPerTestCase: number
): Promise<CodingResult> {
  const results: TestCaseResult[] = [];

  for (const testCase of testCases) {
    try {
      const token = await submitCode(sourceCode, testCase.input, testCase.expected_output);
      const result = await waitForResult(token);

      const passed = result.status.id === 3; // 3 = Accepted
      const actualOutput = result.stdout?.trim() || null;
      const error = result.stderr || result.compile_output || null;

      results.push({
        test_case_id: testCase.id,
        passed,
        input: testCase.input,
        expected_output: testCase.expected_output,
        actual_output: actualOutput,
        error,
      });
    } catch (error) {
      results.push({
        test_case_id: testCase.id,
        passed: false,
        input: testCase.input,
        expected_output: testCase.expected_output,
        actual_output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const score = passedCount * pointsPerTestCase;

  return {
    question_id: questionId,
    results,
    passed_count: passedCount,
    total_count: totalCount,
    score,
  };
}

// Check if Judge0 is configured and available
export function isJudge0Configured(): boolean {
  return !!process.env.JUDGE0_API_URL || !!process.env.JUDGE0_API_KEY;
}

// Status ID descriptions
export const STATUS_DESCRIPTIONS: Record<number, string> = {
  1: 'In Queue',
  2: 'Processing',
  3: 'Accepted',
  4: 'Wrong Answer',
  5: 'Time Limit Exceeded',
  6: 'Compilation Error',
  7: 'Runtime Error (SIGSEGV)',
  8: 'Runtime Error (SIGXFSZ)',
  9: 'Runtime Error (SIGFPE)',
  10: 'Runtime Error (SIGABRT)',
  11: 'Runtime Error (NZEC)',
  12: 'Runtime Error (Other)',
  13: 'Internal Error',
  14: 'Exec Format Error',
};
