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

export interface Violation {
  type: 'tab_switch' | 'window_blur' | 'fullscreen_exit' | 'visibility_hidden';
  timestamp: string;
  message: string;
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
  violation_count?: number;
  violations?: Violation[];
  auto_submitted?: boolean;
}

export interface Batch {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  student_count?: number;
}

export interface BatchStudent {
  id: string;
  batch_id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface TestBatch {
  id: string;
  test_id: string;
  batch_id: string;
  sent_at: string;
  batch?: Batch;
}

export interface PistonExecuteResult {
  output: string;
  error: string;
  exitCode: number;
  compileError?: string;
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
