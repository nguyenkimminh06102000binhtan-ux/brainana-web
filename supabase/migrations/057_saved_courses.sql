-- Lightweight bookmark table, separate from enrollment (user_courses).
-- user_courses = enrolled (committed to studying, appears on homepage).
-- saved_courses = bookmarked (interested but not yet enrolled).

create table saved_courses (
  user_id   uuid references profiles(id)  on delete cascade not null,
  course_id uuid references courses(id)   on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

alter table saved_courses enable row level security;

create policy "Users see own saved courses"
  on saved_courses for select using (auth.uid() = user_id);

create policy "Users manage own saved courses"
  on saved_courses for all using (auth.uid() = user_id);

-- learner_count on courses tracks user_courses rows only (enrollments), not bookmarks.
-- No trigger needed here.
