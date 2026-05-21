-- =====================
-- PROFILES
-- =====================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  total_xp integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_activity_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================
-- COURSES
-- =====================
create table courses (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  cover_image_url text,
  source_language text,
  target_language text,
  category text,
  tags text[],
  is_private boolean not null default false,
  is_published boolean not null default true,
  learner_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================
-- LEVELS (chapters inside a course)
-- =====================
create table levels (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade not null,
  title text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- =====================
-- ITEMS (flashcards inside a level)
-- =====================
create table items (
  id uuid primary key default gen_random_uuid(),
  level_id uuid references levels(id) on delete cascade not null,
  course_id uuid references courses(id) on delete cascade not null,
  front_text text not null,
  back_text text not null,
  front_audio_url text,
  back_audio_url text,
  image_url text,
  romanization text,
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- =====================
-- USER_COURSES (enrollments)
-- =====================
create table user_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  course_id uuid references courses(id) on delete cascade not null,
  enrolled_at timestamptz not null default now(),
  last_studied_at timestamptz,
  completed_items integer not null default 0,
  unique(user_id, course_id)
);

-- =====================
-- ITEM_PROGRESS (SRS state per user per item)
-- =====================
create table item_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  item_id uuid references items(id) on delete cascade not null,
  course_id uuid references courses(id) on delete cascade not null,
  ease_factor numeric not null default 2.5,
  interval_days integer not null default 1,
  repetitions integer not null default 0,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  unique(user_id, item_id)
);

-- =====================
-- STUDY_SESSIONS
-- =====================
create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  course_id uuid references courses(id) on delete cascade not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  items_studied integer not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  xp_earned integer not null default 0
);

-- =====================
-- XP_LOGS (leaderboard source of truth)
-- =====================
create table xp_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  xp_amount integer not null,
  reason text not null check (reason in (
    'study_session',
    'streak_bonus',
    'course_completed',
    'level_completed',
    'daily_goal'
  )),
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- =====================
-- FOLLOWS (social)
-- =====================
create table follows (
  follower_id uuid references profiles(id) on delete cascade not null,
  following_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

-- =====================
-- FEATURE FLAGS (free/pro toggle)
-- =====================
create table feature_flags (
  id uuid primary key default gen_random_uuid(),
  feature_key text unique not null,
  description text,
  free_enabled boolean not null default true,
  pro_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Seed default feature flags
insert into feature_flags (feature_key, description, free_enabled, pro_enabled) values
  ('private_courses',     'Allow setting courses as private',      false, true),
  ('unlimited_courses',   'Create unlimited courses',              false, true),
  ('audio_items',         'Add audio to flashcard items',          false, true),
  ('image_items',         'Add images to flashcard items',         true,  true),
  ('advanced_stats',      'View detailed study statistics',        false, true),
  ('leaderboard_access',  'Access the leaderboard',                true,  true),
  ('social_following',    'Follow other learners',                 true,  true);

-- =====================
-- RLS POLICIES
-- =====================
alter table profiles enable row level security;
alter table courses enable row level security;
alter table levels enable row level security;
alter table items enable row level security;
alter table user_courses enable row level security;
alter table item_progress enable row level security;
alter table study_sessions enable row level security;
alter table xp_logs enable row level security;
alter table follows enable row level security;

-- Profiles
create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Courses
create policy "Public courses viewable by everyone"
  on courses for select using (is_private = false or creator_id = auth.uid());
create policy "Users can create courses"
  on courses for insert with check (auth.uid() = creator_id);
create policy "Users can update own courses"
  on courses for update using (auth.uid() = creator_id);
create policy "Users can delete own courses"
  on courses for delete using (auth.uid() = creator_id);

-- Levels
create policy "Levels viewable if course is viewable"
  on levels for select using (
    exists (
      select 1 from courses
      where courses.id = levels.course_id
      and (courses.is_private = false or courses.creator_id = auth.uid())
    )
  );
create policy "Course owners manage levels"
  on levels for all using (
    exists (select 1 from courses where courses.id = levels.course_id and courses.creator_id = auth.uid())
  );

-- Items
create policy "Items viewable if course is viewable"
  on items for select using (
    exists (
      select 1 from courses
      where courses.id = items.course_id
      and (courses.is_private = false or courses.creator_id = auth.uid())
    )
  );
create policy "Course owners manage items"
  on items for all using (
    exists (select 1 from courses where courses.id = items.course_id and courses.creator_id = auth.uid())
  );

-- User courses
create policy "Users see own enrollments"
  on user_courses for select using (auth.uid() = user_id);
create policy "Users manage own enrollments"
  on user_courses for all using (auth.uid() = user_id);

-- Item progress
create policy "Users see own progress"
  on item_progress for select using (auth.uid() = user_id);
create policy "Users manage own progress"
  on item_progress for all using (auth.uid() = user_id);

-- Study sessions
create policy "Users see own sessions"
  on study_sessions for select using (auth.uid() = user_id);
create policy "Users manage own sessions"
  on study_sessions for all using (auth.uid() = user_id);

-- XP logs
create policy "XP logs are public for leaderboard"
  on xp_logs for select using (true);
create policy "Users insert own xp"
  on xp_logs for insert with check (auth.uid() = user_id);

-- Follows
create policy "Follows are public"
  on follows for select using (true);
create policy "Users manage own follows"
  on follows for all using (auth.uid() = follower_id);

-- =====================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =====================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
