-- ============================================================
-- Unify auth: merge `students` + env-based admin into one `users` table.
-- Run in Supabase SQL editor. Idempotent.
-- ============================================================

-- 1. Role enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'student');
  end if;
end $$;

-- 2. Users table
create table if not exists users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  name text not null,
  password_hash text not null,
  role user_role not null default 'student',
  created_at timestamp with time zone default now()
);

create index if not exists idx_users_email on users(lower(email));
create index if not exists idx_users_role on users(role);

-- 3. Backfill from existing `students` (if it exists)
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'students') then
    insert into users (id, email, name, password_hash, role, created_at)
    select id, lower(email), coalesce(name, email), password_hash, 'student'::user_role, coalesce(created_at, now())
    from students
    on conflict (email) do nothing;
  end if;
end $$;

-- 4. Seed initial admin from a known email (change as needed, then update password via app).
-- Password below = bcrypt('admin123', 10). Rotate immediately after first login.
insert into users (email, name, password_hash, role)
values (
  'admin@test.com',
  'Admin',
  '$2b$10$Q1KwwhHaQ4U/QOG9uEpYaeUSdQWB1Uw9rtyu1sV6mOO4qGz8t6Tre',
  'admin'
)
on conflict (email) do update set role = 'admin';
