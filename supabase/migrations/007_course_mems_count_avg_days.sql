alter table courses
  add column if not exists mems_count integer not null default 0,
  add column if not exists avg_completion_days integer;
