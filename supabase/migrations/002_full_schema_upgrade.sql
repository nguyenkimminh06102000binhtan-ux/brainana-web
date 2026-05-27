-- =====================
-- STEP 1: UPDATE PROFILES
-- =====================
alter table profiles
  add column if not exists bio text,
  add column if not exists daily_goal integer not null default 10,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists level integer not null default 1,
  add column if not exists website_url text,
  add column if not exists twitter_handle text;

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
  add column if not exists streak integer not null default 0;

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