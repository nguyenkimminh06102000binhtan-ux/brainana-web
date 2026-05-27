-- Simplify feature_flags: presence of a key means pro-only.
-- Features not in this table are free for everyone.
alter table feature_flags
  drop column if exists free_enabled,
  drop column if exists pro_enabled;

-- Remove all old flag rows and keep only pro-gated features
truncate table feature_flags;

insert into feature_flags (feature_key, description) values
  ('ai_course_create', 'Generate a course using AI');
