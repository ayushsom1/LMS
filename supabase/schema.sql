-- LMS Test Management System Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Tests table
create table if not exists tests (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  duration_minutes int not null default 60,
  access_code text unique not null,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- Questions table
create table if not exists questions (
  id uuid default uuid_generate_v4() primary key,
  test_id uuid references tests(id) on delete cascade,
  type text not null check (type in ('mcq', 'coding')),
  title text not null,
  description text,
  options jsonb,
  correct_answer text,
  test_cases jsonb,
  points int not null default 10,
  order_index int not null default 0
);

-- Submissions table (NO foreign key to batches - submissions persist even if batch is deleted)
create table if not exists submissions (
  id uuid default uuid_generate_v4() primary key,
  test_id uuid references tests(id) on delete cascade,
  student_name text not null,
  student_email text not null,
  answers jsonb default '{}',
  mcq_score int default 0,
  coding_score int default 0,
  total_score int default 0,
  status text default 'in_progress',
  submitted_at timestamp with time zone,
  violations jsonb default '[]',
  violation_count int default 0,
  auto_submitted boolean default false
);

-- Batches table
create table if not exists batches (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  created_at timestamp with time zone default now()
);

-- Batch students table
create table if not exists batch_students (
  id uuid default uuid_generate_v4() primary key,
  batch_id uuid references batches(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamp with time zone default now(),
  unique(batch_id, email)
);

-- Test-Batch linking table (for tracking which batches received which tests)
create table if not exists test_batches (
  id uuid default uuid_generate_v4() primary key,
  test_id uuid references tests(id) on delete cascade,
  batch_id uuid references batches(id) on delete cascade,
  sent_at timestamp with time zone default now(),
  unique(test_id, batch_id)
);

-- Indexes for better performance
create index if not exists idx_tests_access_code on tests(access_code);
create index if not exists idx_questions_test_id on questions(test_id);
-- Composite index on (test_id, order_index) eliminates the post-scan sort on ORDER BY order_index
create index if not exists idx_questions_test_id_order on questions(test_id, order_index asc);
create index if not exists idx_submissions_test_id on submissions(test_id);
create index if not exists idx_submissions_student_email on submissions(student_email);
-- Composite index for duplicate-submission check (test_id + student_email together)
create index if not exists idx_submissions_test_email on submissions(test_id, student_email);
-- Status index for admin filtering (graded, in_progress, submitted)
create index if not exists idx_submissions_status on submissions(status);
-- Ordering index for student dashboard (most recent first)
create index if not exists idx_submissions_created_at on submissions(created_at desc);
create index if not exists idx_batch_students_batch_id on batch_students(batch_id);
create index if not exists idx_batch_students_email on batch_students(email);
create index if not exists idx_batch_students_created_at on batch_students(created_at desc);
create index if not exists idx_test_batches_test_id on test_batches(test_id);
create index if not exists idx_test_batches_batch_id on test_batches(batch_id);

-- Row Level Security (RLS) Policies
-- Enable RLS
alter table tests enable row level security;
alter table questions enable row level security;
alter table submissions enable row level security;

-- Allow public read access to active tests (for students)
create policy "Allow public read access to active tests"
  on tests for select
  using (is_active = true);

-- Allow public read access to questions for active tests
create policy "Allow public read access to questions"
  on questions for select
  using (
    exists (
      select 1 from tests
      where tests.id = questions.test_id
      and tests.is_active = true
    )
  );

-- Allow students to insert their own submissions
create policy "Allow students to create submissions"
  on submissions for insert
  with check (true);

-- Allow students to update their own in-progress submissions
create policy "Allow students to update their submissions"
  on submissions for update
  using (status = 'in_progress');

-- Allow public to read their own submissions (by email)
create policy "Allow reading own submissions"
  on submissions for select
  using (true);

-- Note: For full admin access, use the service role key which bypasses RLS
