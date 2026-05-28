-- Multi-language support: allowed languages per coding question.
-- For MCQ rows this column is ignored.
alter table questions
  add column if not exists allowed_languages text[] not null default '{cpp}';
