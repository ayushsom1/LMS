-- Migration: Fix batch delete cascade behavior
-- Run this in your Supabase SQL Editor to ensure submissions are NOT deleted when batches are deleted

-- Step 1: Check if submissions has any foreign key to batches (it shouldn't)
-- If there's any FK from submissions to batches, remove it
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find any foreign key from submissions to batches
    FOR constraint_name IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'submissions'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'batches'
    LOOP
        EXECUTE format('ALTER TABLE submissions DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;

    -- Find any foreign key from submissions to batch_students
    FOR constraint_name IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'submissions'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'batch_students'
    LOOP
        EXECUTE format('ALTER TABLE submissions DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Step 2: Ensure batches table exists with correct structure
CREATE TABLE IF NOT EXISTS batches (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

-- Step 3: Ensure batch_students has correct CASCADE on batch_id
-- First drop the constraint if it exists with wrong behavior
ALTER TABLE IF EXISTS batch_students
    DROP CONSTRAINT IF EXISTS batch_students_batch_id_fkey;

-- Re-add with correct CASCADE
ALTER TABLE batch_students
    ADD CONSTRAINT batch_students_batch_id_fkey
    FOREIGN KEY (batch_id)
    REFERENCES batches(id)
    ON DELETE CASCADE;

-- Step 4: Ensure test_batches has correct CASCADE on both FKs
ALTER TABLE IF EXISTS test_batches
    DROP CONSTRAINT IF EXISTS test_batches_batch_id_fkey;

ALTER TABLE IF EXISTS test_batches
    DROP CONSTRAINT IF EXISTS test_batches_test_id_fkey;

-- Re-add with correct CASCADE
ALTER TABLE test_batches
    ADD CONSTRAINT test_batches_batch_id_fkey
    FOREIGN KEY (batch_id)
    REFERENCES batches(id)
    ON DELETE CASCADE;

ALTER TABLE test_batches
    ADD CONSTRAINT test_batches_test_id_fkey
    FOREIGN KEY (test_id)
    REFERENCES tests(id)
    ON DELETE CASCADE;

-- Step 5: Verify submissions table has NO foreign key to batches
-- This SELECT will show any problematic constraints (should return empty)
SELECT
    tc.constraint_name,
    tc.table_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'submissions'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND (ccu.table_name = 'batches' OR ccu.table_name = 'batch_students');

-- Done! Submissions will now persist even when batches are deleted.
