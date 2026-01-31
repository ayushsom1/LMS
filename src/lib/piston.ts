import { TestCase, TestCaseResult, CodingResult } from '@/types';

// Piston public API - no rate limits, no API key required
const PISTON_URL = 'https://emkc.org/api/v2/piston';

export type Language = 'c' | 'cpp';

interface PistonRuntime {
  language: string;
  version: string;
  aliases: string[];
}

interface PistonExecuteRequest {
  language: string;
  version: string;
  files: { name?: string; content: string }[];
  stdin?: string;
  args?: string[];
  compile_timeout?: number;
  run_timeout?: number;
  compile_memory_limit?: number;
  run_memory_limit?: number;
}

interface PistonExecuteResponse {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output: string;
  };
}

// Language configurations
const LANGUAGE_CONFIG: Record<Language, { language: string; version: string }> = {
  c: { language: 'c', version: '10.2.0' },
  cpp: { language: 'cpp', version: '10.2.0' },
};

/**
 * Get available runtimes from Piston
 */
export async function getRuntimes(): Promise<PistonRuntime[]> {
  const response = await fetch(`${PISTON_URL}/runtimes`);
  if (!response.ok) {
    throw new Error('Failed to fetch Piston runtimes');
  }
  return response.json();
}

/**
 * Execute code using Piston API
 */
export async function executeCode(
  sourceCode: string,
  stdin: string,
  language: Language = 'cpp'
): Promise<{ output: string; error: string; exitCode: number; compileError?: string }> {
  const config = LANGUAGE_CONFIG[language];

  const payload: PistonExecuteRequest = {
    language: config.language,
    version: config.version,
    files: [{ content: sourceCode }],
    stdin: stdin,
    compile_timeout: 10000,  // 10 seconds for compilation
    run_timeout: 5000,       // 5 seconds for execution
  };

  const response = await fetch(`${PISTON_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Piston execution failed: ${errorText}`);
  }

  const result: PistonExecuteResponse = await response.json();

  // Check for compilation errors
  if (result.compile && result.compile.code !== 0) {
    return {
      output: '',
      error: result.compile.stderr || result.compile.output,
      exitCode: result.compile.code,
      compileError: result.compile.stderr || result.compile.output,
    };
  }

  return {
    output: result.run.stdout,
    error: result.run.stderr,
    exitCode: result.run.code,
  };
}

/**
 * Compare expected and actual output (trimming whitespace)
 */
function compareOutput(expected: string, actual: string): boolean {
  const normalizedExpected = expected.trim().replace(/\r\n/g, '\n');
  const normalizedActual = actual.trim().replace(/\r\n/g, '\n');
  return normalizedExpected === normalizedActual;
}

/**
 * Evaluate code against multiple test cases
 */
export async function evaluateCode(
  sourceCode: string,
  testCases: TestCase[],
  questionId: string,
  pointsPerTestCase: number,
  language: Language = 'cpp'
): Promise<CodingResult> {
  const results: TestCaseResult[] = [];

  for (const testCase of testCases) {
    try {
      const result = await executeCode(sourceCode, testCase.input, language);

      // Check for compilation or runtime errors
      if (result.compileError) {
        results.push({
          test_case_id: testCase.id,
          passed: false,
          input: testCase.input,
          expected_output: testCase.expected_output,
          actual_output: null,
          error: `Compilation Error: ${result.compileError}`,
        });
        continue;
      }

      if (result.exitCode !== 0 || result.error) {
        results.push({
          test_case_id: testCase.id,
          passed: false,
          input: testCase.input,
          expected_output: testCase.expected_output,
          actual_output: result.output || null,
          error: result.error || `Runtime Error (exit code: ${result.exitCode})`,
        });
        continue;
      }

      // Compare output
      const passed = compareOutput(testCase.expected_output, result.output);

      results.push({
        test_case_id: testCase.id,
        passed,
        input: testCase.input,
        expected_output: testCase.expected_output,
        actual_output: result.output.trim(),
        error: passed ? null : 'Wrong Answer',
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

  const passedCount = results.filter((r) => r.passed).length;
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

/**
 * Check if Piston API is available
 */
export async function isPistonAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${PISTON_URL}/runtimes`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}
