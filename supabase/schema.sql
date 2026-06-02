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
  ignored boolean not null default false,
  hard boolean not null default false,
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
-- =====================
-- STEP 1: UPDATE PROFILES
-- =====================
alter table profiles
  add column if not exists bio text,
  add column if not exists daily_goal integer not null default 10,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists level integer not null default 1,
  add column if not exists website_url text,
  add column if not exists twitter_handle text,
  add column if not exists show_romanization boolean not null default true;

-- =====================
-- STEP 2: UPDATE COURSES
-- =====================

-- Add slug (unique URL identifier)
alter table courses
  add column if not exists slug text unique,
  add column if not exists tier text not null default 'simple'
    check (tier in ('simple', 'medium', 'power')),
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'unlisted', 'private')),
  add column if not exists level text
    check (level in ('beginner', 'intermediate', 'advanced')),
  add column if not exists verified boolean not null default false,
  add column if not exists rating numeric not null default 0,
  add column if not exists rating_count integer not null default 0,
  add column if not exists has_audio boolean not null default false,
  add column if not exists has_images boolean not null default false,
  add column if not exists card_count integer not null default 0;

-- Migrate is_private → visibility
update courses set visibility = 'private' where is_private = true;
update courses set visibility = 'public'  where is_private = false;

-- Generate slugs for existing courses from title
update courses
  set slug = lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'))
           || '-' || substr(id::text, 1, 6)
  where slug is null;

-- Make slug not null after populating
alter table courses alter column slug set not null;

-- Update visibility RLS policy to replace is_private
drop policy if exists "Public courses viewable by everyone" on courses;
create policy "Courses viewable by visibility"
  on courses for select using (
    visibility = 'public'
    or creator_id = auth.uid()
    or (visibility = 'unlisted')
  );

-- =====================
-- STEP 3: UPDATE ITEMS → CARDS structure
-- =====================

-- Add JSONB front/back columns alongside existing text columns
-- (keep old columns for now, migrate data, then drop)
alter table items
  add column if not exists front jsonb,
  add column if not exists back  jsonb,
  add column if not exists mems_count integer not null default 0;

-- Migrate existing text data into JSONB
update items set
  front = jsonb_build_object('text', front_text),
  back  = jsonb_build_object('text', back_text)
where front is null;

-- =====================
-- STEP 4: UPDATE ITEM_PROGRESS
-- =====================
alter table item_progress
  add column if not exists mastered boolean not null default false,
  add column if not exists streak integer not null default 0,
  add column if not exists ignored boolean not null default false,
  add column if not exists hard boolean not null default false;

-- =====================
-- STEP 5: CREATE MEMS TABLE
-- =====================
create table if not exists mems (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references items(id) on delete cascade not null,
  author_id uuid references profiles(id) on delete cascade not null,
  text text not null,
  helpful_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique(card_id, author_id)
);

alter table mems enable row level security;

create policy "Mems are public"
  on mems for select using (true);
create policy "Users create own mems"
  on mems for insert with check (auth.uid() = author_id);
create policy "Users update own mems"
  on mems for update using (auth.uid() = author_id);
create policy "Users delete own mems"
  on mems for delete using (auth.uid() = author_id);

-- =====================
-- STEP 6: CREATE MEM_VOTES TABLE
-- =====================
create table if not exists mem_votes (
  user_id uuid references profiles(id) on delete cascade not null,
  mem_id uuid references mems(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (user_id, mem_id)
);

alter table mem_votes enable row level security;

create policy "Mem votes are public"
  on mem_votes for select using (true);
create policy "Users manage own votes"
  on mem_votes for all using (auth.uid() = user_id);

-- =====================
-- STEP 7: CREATE CHAPTERS TABLE (Power tier)
-- =====================
create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade not null,
  title text not null,
  description text,
  position integer not null default 0,
  unlock_condition jsonb,
  created_at timestamptz not null default now()
);

alter table chapters enable row level security;

create policy "Chapters viewable if course is viewable"
  on chapters for select using (
    exists (
      select 1 from courses
      where courses.id = chapters.course_id
      and (courses.visibility != 'private' or courses.creator_id = auth.uid())
    )
  );
create policy "Course owners manage chapters"
  on chapters for all using (
    exists (
      select 1 from courses
      where courses.id = chapters.course_id
      and courses.creator_id = auth.uid()
    )
  );

-- =====================
-- STEP 8: CREATE BADGES TABLE
-- =====================
create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  icon_url text,
  condition jsonb,
  created_at timestamptz not null default now()
);

create table if not exists user_badges (
  user_id uuid references profiles(id) on delete cascade not null,
  badge_id uuid references badges(id) on delete cascade not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table badges enable row level security;
alter table user_badges enable row level security;

create policy "Badges are public"
  on badges for select using (true);
create policy "User badges are public"
  on user_badges for select using (true);
create policy "System inserts user badges"
  on user_badges for insert with check (auth.uid() = user_id);

-- Seed starter badges
insert into badges (key, name, description) values
  ('first_course',     'First Brain',        'Enrolled in your first course'),
  ('first_study',      'Hungry Zombie',      'Completed your first study session'),
  ('streak_7',         'Week Warrior',       '7 day study streak'),
  ('streak_30',        'Month Monster',      '30 day study streak'),
  ('course_creator',   'Brain Chef',         'Created your first course'),
  ('mastered_100',     'Century Brain',      'Mastered 100 cards'),
  ('top_leaderboard',  'Zombie King',        'Reached #1 on any leaderboard')
on conflict (key) do nothing;

-- =====================
-- STEP 9: UPDATE FEATURE FLAGS
-- =====================
insert into feature_flags (feature_key, description, free_enabled, pro_enabled) values
  ('medium_tier_creator',  'Access Medium tier course creator',  false, true),
  ('power_tier_creator',   'Access Power tier course creator',   false, true),
  ('audio_recording',      'Record audio for cards',             false, true),
  ('zombie_mode',          'Access Zombie survival mode',        false, true),
  ('unlisted_courses',     'Create unlisted courses',            true,  true),
  ('mem_submission',       'Submit mems on cards',               true,  true),
  ('course_rating',        'Rate courses',                       true,  true)
on conflict (feature_key) do nothing;

-- =====================
-- STEP 10: INDEXES FOR PERFORMANCE
-- =====================
create index if not exists idx_item_progress_due
  on item_progress (user_id, next_review_at);
create index if not exists idx_courses_slug
  on courses (slug);
create index if not exists idx_courses_visibility
  on courses (visibility, is_published);
create index if not exists idx_items_course
  on items (course_id);
create index if not exists idx_xp_logs_user_created
  on xp_logs (user_id, created_at desc);
create index if not exists idx_mems_card
  on mems (card_id);
