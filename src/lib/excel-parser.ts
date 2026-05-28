import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { MCQOption, TestCase } from '@/types';
import { isLanguage, Language, SUPPORTED_LANGUAGES } from './piston';

// Excel column layout (header row, exact names):
//   type | title | description | options | correct_answer |
//   test_cases | points | order_index | allowed_languages
//
// MCQ rows:
//   options: pipe-separated list, e.g. "Paris|Berlin|Madrid|Rome"
//   correct_answer: 1-based index OR the exact option text
//
// Coding rows:
//   test_cases: cases separated by "###"; each case "input==>expected".
//     Prefix a case with "H:" to mark it hidden (e.g. "H:1 2==>3").
//   allowed_languages: comma-separated subset of cpp,python,java (default cpp).

export interface ParsedQuestionRow {
  row: number;
  type: 'mcq' | 'coding';
  title: string;
  description: string;
  options: MCQOption[] | null;
  correct_answer: string | null;
  test_cases: TestCase[] | null;
  allowed_languages: Language[];
  points: number;
  order_index: number;
}

export interface RowError {
  row: number;
  message: string;
}

export interface ParseResult {
  rows: ParsedQuestionRow[];
  errors: RowError[];
}

const HEADER_ALIASES: Record<string, string> = {
  type: 'type',
  title: 'title',
  description: 'description',
  options: 'options',
  correct_answer: 'correct_answer',
  correctanswer: 'correct_answer',
  test_cases: 'test_cases',
  testcases: 'test_cases',
  points: 'points',
  order_index: 'order_index',
  orderindex: 'order_index',
  allowed_languages: 'allowed_languages',
  allowedlanguages: 'allowed_languages',
};

function normalizeHeader(h: string): string {
  const key = h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
  return HEADER_ALIASES[key] || HEADER_ALIASES[key.replace(/_/g, '')] || key;
}

function parseOptions(raw: string): MCQOption[] {
  return raw
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((text) => ({ id: uuidv4(), text }));
}

// Translate \n, \t, \\ escapes so spreadsheet cells can encode multi-line stdin/stdout.
function unescapeCell(s: string): string {
  return s.replace(/\\(.)/g, (_, ch) => {
    if (ch === 'n') return '\n';
    if (ch === 't') return '\t';
    if (ch === 'r') return '\r';
    return ch;
  });
}

function parseTestCases(raw: string): TestCase[] {
  return raw
    .split('###')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      let hidden = false;
      let body = chunk;
      if (body.startsWith('H:')) {
        hidden = true;
        body = body.slice(2);
      }
      const sep = body.indexOf('==>');
      const input = sep >= 0 ? body.slice(0, sep) : '';
      const expected = sep >= 0 ? body.slice(sep + 3) : body;
      return {
        id: uuidv4(),
        input: unescapeCell(input),
        expected_output: unescapeCell(expected),
        is_hidden: hidden,
      };
    });
}

function parseLanguages(raw: string): Language[] {
  if (!raw.trim()) return ['cpp'];
  const parts = raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const langs = parts.filter(isLanguage);
  return langs.length > 0 ? Array.from(new Set(langs)) : ['cpp'];
}

export function parseQuestionsWorkbook(buffer: ArrayBuffer | Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: [{ row: 0, message: 'Workbook has no sheets' }] };
  }
  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  if (rawRows.length === 0) {
    return { rows: [], errors: [{ row: 0, message: 'Sheet is empty' }] };
  }

  const rows: ParsedQuestionRow[] = [];
  const errors: RowError[] = [];

  rawRows.forEach((raw, i) => {
    const rowNum = i + 2; // header is row 1
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      normalized[normalizeHeader(k)] = String(v ?? '').trim();
    }

    const type = normalized.type?.toLowerCase();
    if (type !== 'mcq' && type !== 'coding') {
      errors.push({ row: rowNum, message: `Invalid type "${normalized.type}" (expected "mcq" or "coding")` });
      return;
    }

    if (!normalized.title) {
      errors.push({ row: rowNum, message: 'Title is required' });
      return;
    }

    const points = parseInt(normalized.points || '10', 10);
    if (!Number.isFinite(points) || points <= 0) {
      errors.push({ row: rowNum, message: `Invalid points "${normalized.points}"` });
      return;
    }

    const orderIndex = parseInt(normalized.order_index || String(i), 10);

    let options: MCQOption[] | null = null;
    let correctAnswer: string | null = null;
    let testCases: TestCase[] | null = null;
    let allowed: Language[] = ['cpp'];

    if (type === 'mcq') {
      options = parseOptions(normalized.options || '');
      if (options.length < 2) {
        errors.push({ row: rowNum, message: 'MCQ needs at least 2 options (pipe-separated)' });
        return;
      }
      const rawCorrect = normalized.correct_answer;
      if (!rawCorrect) {
        errors.push({ row: rowNum, message: 'MCQ requires a correct_answer' });
        return;
      }
      const asIndex = parseInt(rawCorrect, 10);
      if (Number.isFinite(asIndex) && asIndex >= 1 && asIndex <= options.length) {
        correctAnswer = options[asIndex - 1].id;
      } else {
        const match = options.find((o) => o.text.toLowerCase() === rawCorrect.toLowerCase());
        if (!match) {
          errors.push({
            row: rowNum,
            message: `correct_answer "${rawCorrect}" does not match any option (use 1-based index or exact text)`,
          });
          return;
        }
        correctAnswer = match.id;
      }
    } else {
      testCases = parseTestCases(normalized.test_cases || '');
      if (testCases.length === 0) {
        errors.push({
          row: rowNum,
          message: 'Coding needs at least 1 test case (format: "input==>expected", separate with ###)',
        });
        return;
      }
      allowed = parseLanguages(normalized.allowed_languages || '');
    }

    rows.push({
      row: rowNum,
      type,
      title: normalized.title,
      description: normalized.description || '',
      options,
      correct_answer: correctAnswer,
      test_cases: testCases,
      allowed_languages: allowed,
      points,
      order_index: Number.isFinite(orderIndex) ? orderIndex : i,
    });
  });

  return { rows, errors };
}

export const EXCEL_TEMPLATE_COLUMNS = [
  'type',
  'title',
  'description',
  'options',
  'correct_answer',
  'test_cases',
  'points',
  'order_index',
  'allowed_languages',
];

export const SUPPORTED_LANGS = SUPPORTED_LANGUAGES;
