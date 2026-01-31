export interface Test {
  id: string;
  title: string;
  duration_minutes: number;
  access_code: string;
  is_active: boolean;
  created_at: string;
}

export interface MCQOption {
  id: string;
  text: string;
}

export interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

export interface Question {
  id: string;
  test_id: string;
  type: 'mcq' | 'coding';
  title: string;
  description: string | null;
  options: MCQOption[] | null;
  correct_answer: string | null;
  test_cases: TestCase[] | null;
  points: number;
  order_index: number;
}

export interface Submission {
  id: string;
  test_id: string;
  student_name: string;
  student_email: string;
  answers: Record<string, string>;
  mcq_score: number;
  coding_score: number;
  total_score: number;
  status: 'in_progress' | 'submitted' | 'graded';
  submitted_at: string | null;
  started_at?: string;
}

export interface Judge0Submission {
  source_code: string;
  language_id: number;
  stdin: string;
  expected_output: string;
}

export interface Judge0Result {
  token: string;
  status: {
    id: number;
    description: string;
  };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;
  memory: number | null;
}

export interface TestCaseResult {
  test_case_id: string;
  passed: boolean;
  input: string;
  expected_output: string;
  actual_output: string | null;
  error: string | null;
}

export interface CodingResult {
  question_id: string;
  results: TestCaseResult[];
  passed_count: number;
  total_count: number;
  score: number;
}
