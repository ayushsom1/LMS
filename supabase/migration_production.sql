-- ============================================================
-- Production Migration: Scaling fixes for 2000 concurrent users
-- Run this in your Supabase SQL Editor or against RDS
-- ============================================================

-- 1. Add started_at column for server-side timer enforcement
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone;

-- Backfill existing in-progress submissions
UPDATE submissions
  SET started_at = created_at
  WHERE started_at IS NULL AND status = 'in_progress';

-- 2. Add unique constraint to prevent duplicate submissions (race condition fix)
-- This may fail if duplicates already exist — clean them up first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_test_student'
  ) THEN
    ALTER TABLE submissions
      ADD CONSTRAINT unique_test_student UNIQUE (test_id, student_email);
  END IF;
END $$;

-- 3. Add composite index for the duplicate-check query
CREATE INDEX IF NOT EXISTS idx_submissions_test_email
  ON submissions(test_id, student_email);

-- 4. Add created_at to submissions if missing
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- 5. Add index on submissions status for grading worker queries
CREATE INDEX IF NOT EXISTS idx_submissions_status
  ON submissions(status)
  WHERE status IN ('submitted', 'in_progress');

-- 6. Verify indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('submissions', 'tests', 'questions')
ORDER BY tablename, indexname;
