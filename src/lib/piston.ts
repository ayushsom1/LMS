import { TestCase, TestCaseResult, CodingResult } from '@/types';

// Judge0 API (self-hosted) or fallback to Piston public API
const JUDGE0_URL = process.env.JUDGE0_API_URL || '';
const PISTON_URL = 'https://emkc.org/api/v2/piston';

const useJudge0 = !!JUDGE0_URL;

export type Language = 'c' | 'cpp';

// Judge0 language IDs
const JUDGE0_LANGUAGE_IDS: Record<Language, number> = {
  c: 50,    // C (GCC 9.2.0)
  cpp: 54,  // C++ (GCC 9.2.0)
};

// Piston language configs (fallback)
const PISTON_LANGUAGE_CONFIG: Record<Language, { language: string; version: string }> = {
  c: { language: 'c', version: '10.2.0' },
  cpp: { language: 'cpp', version: '10.2.0' },
};

interface PistonExecuteRequest {
  language: string;
  version: string;
  files: { name?: string; content: string }[];
  stdin?: string;
  compile_timeout?: number;
  run_timeout?: number;
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

/**
 * Execute code using Judge0 API (self-hosted)
 */
async function executeWithJudge0(
  sourceCode: string,
  stdin: string,
  language: Language
): Promise<{ output: string; error: string; exitCode: number; compileError?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s hard timeout

  try {
    // Submit code for execution
    const submitResponse = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: JUDGE0_LANGUAGE_IDS[language],
        stdin: stdin,
        cpu_time_limit: 5,
        wall_time_limit: 10,
        memory_limit: 128000, // 128 MB
      }),
      signal: controller.signal,
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`Judge0 execution failed: ${errorText}`);
    }

    const result = await submitResponse.json();

    // Judge0 status codes:
    // 1-2: In Queue/Processing
    // 3: Accepted (success)
    // 4: Wrong Answer
    // 5: Time Limit Exceeded
    // 6: Compilation Error
    // 7-12: Various runtime errors
    // 13: Internal Error

    if (result.status?.id === 6) {
      return {
        output: '',
        error: result.compile_output || 'Compilation Error',
        exitCode: 1,
        compileError: result.compile_output || 'Compilation Error',
      };
    }

    if (result.status?.id >= 7 && result.status?.id <= 12) {
      return {
        output: result.stdout || '',
        error: result.stderr || result.status?.description || 'Runtime Error',
        exitCode: 1,
      };
    }

    if (result.status?.id === 5) {
      return {
        output: '',
        error: 'Time Limit Exceeded',
        exitCode: 1,
      };
    }

    return {
      output: result.stdout || '',
      error: result.stderr || '',
      exitCode: result.status?.id === 3 ? 0 : 1,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Judge0 execution timed out after 15s');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Execute code using Piston public API (fallback)
 */
async function executeWithPiston(
  sourceCode: string,
  stdin: string,
  language: Language
): Promise<{ output: string; error: string; exitCode: number; compileError?: string }> {
  const config = PISTON_LANGUAGE_CONFIG[language];

  const payload: PistonExecuteRequest = {
    language: config.language,
    version: config.version,
    files: [{ content: sourceCode }],
    stdin: stdin,
    compile_timeout: 10000,
    run_timeout: 5000,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s — Piston is remote, allow more

  try {
    const response = await fetch(`${PISTON_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Piston execution failed: ${errorText}`);
    }

    const result: PistonExecuteResponse = await response.json();

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
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Piston execution timed out after 20s');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Execute code — uses Judge0 if configured, falls back to Piston
 */
export async function executeCode(
  sourceCode: string,
  stdin: string,
  language: Language = 'cpp'
): Promise<{ output: string; error: string; exitCode: number; compileError?: string }> {
  if (useJudge0) {
    return executeWithJudge0(sourceCode, stdin, language);
  }
  return executeWithPiston(sourceCode, stdin, language);
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
 * Evaluate code against multiple test cases — runs in PARALLEL
 */
export async function evaluateCode(
  sourceCode: string,
  testCases: TestCase[],
  questionId: string,
  pointsPerTestCase: number,
  language: Language = 'cpp'
): Promise<CodingResult> {
  // Run all test cases in parallel instead of sequentially
  const resultPromises = testCases.map(async (testCase): Promise<TestCaseResult> => {
    try {
      const result = await executeCode(sourceCode, testCase.input, language);

      if (result.compileError) {
        return {
          test_case_id: testCase.id,
          passed: false,
          input: testCase.input,
          expected_output: testCase.expected_output,
          actual_output: null,
          error: `Compilation Error: ${result.compileError}`,
        };
      }

      if (result.exitCode !== 0 || result.error) {
        return {
          test_case_id: testCase.id,
          passed: false,
          input: testCase.input,
          expected_output: testCase.expected_output,
          actual_output: result.output || null,
          error: result.error || `Runtime Error (exit code: ${result.exitCode})`,
        };
      }

      const passed = compareOutput(testCase.expected_output, result.output);

      return {
        test_case_id: testCase.id,
        passed,
        input: testCase.input,
        expected_output: testCase.expected_output,
        actual_output: result.output.trim(),
        error: passed ? null : 'Wrong Answer',
      };
    } catch (error) {
      return {
        test_case_id: testCase.id,
        passed: false,
        input: testCase.input,
        expected_output: testCase.expected_output,
        actual_output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  const results = await Promise.all(resultPromises);

  const passedCount = results.filter((r) => r.passed).length;
  const score = passedCount * pointsPerTestCase;

  return {
    question_id: questionId,
    results,
    passed_count: passedCount,
    total_count: results.length,
    score,
  };
}

/**
 * Check if code execution engine is available
 */
export async function isExecutionEngineAvailable(): Promise<boolean> {
  try {
    if (useJudge0) {
      const response = await fetch(`${JUDGE0_URL}/system_info`, { method: 'GET' });
      return response.ok;
    }
    const response = await fetch(`${PISTON_URL}/runtimes`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}
