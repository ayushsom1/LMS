-- Test scheduling: optional time window when a test can be started
-- Run this in Supabase SQL Editor.

alter table tests
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at   timestamptz;

-- Sanity constraint: if both are set, end must be after start
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tests_window_valid'
  ) then
    alter table tests
      add constraint tests_window_valid
      check (starts_at is null or ends_at is null or ends_at > starts_at);
  end if;
end $$;

create index if not exists idx_tests_window on tests(starts_at, ends_at);
