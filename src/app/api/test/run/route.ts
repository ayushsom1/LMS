import { NextRequest, NextResponse } from 'next/server';
import { executeCode, Language } from '@/lib/piston';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, testCases, language = 'cpp' } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return NextResponse.json({ error: 'Test cases are required' }, { status: 400 });
    }

    // Run all test cases in parallel
    const resultPromises = testCases.map(async (testCase: { id: string; input: string; expected_output: string }) => {
      try {
        const result = await executeCode(code, testCase.input || '', language as Language);

        if (result.compileError) {
          return {
            id: testCase.id,
            input: testCase.input,
            expected: testCase.expected_output,
            actual: null,
            passed: false,
            error: `Compilation Error: ${result.compileError}`,
          };
        }

        if (result.exitCode !== 0 || result.error) {
          return {
            id: testCase.id,
            input: testCase.input,
            expected: testCase.expected_output,
            actual: result.output || null,
            passed: false,
            error: result.error || `Runtime Error (exit code: ${result.exitCode})`,
          };
        }

        const actualOutput = result.output.trim();
        const expectedOutput = testCase.expected_output.trim();
        const passed = actualOutput === expectedOutput;

        return {
          id: testCase.id,
          input: testCase.input,
          expected: testCase.expected_output,
          actual: actualOutput,
          passed,
          error: null,
        };
      } catch (error) {
        return {
          id: testCase.id,
          input: testCase.input,
          expected: testCase.expected_output,
          actual: null,
          passed: false,
          error: error instanceof Error ? error.message : 'Execution failed',
        };
      }
    });

    const results = await Promise.all(resultPromises);
    const passedCount = results.filter((r) => r.passed).length;

    return NextResponse.json({
      results,
      passed: passedCount,
      total: results.length,
    });
  } catch (error) {
    console.error('Failed to run code:', error);
    return NextResponse.json({ error: 'Failed to run code' }, { status: 500 });
  }
}
