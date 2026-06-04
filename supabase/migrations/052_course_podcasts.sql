-- AI-generated course podcasts for paid learners.

create table if not exists course_podcasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  plan text not null check (plan in ('plus', 'pro')),
  status text not null default 'queued' check (status in ('queued', 'generating_script', 'generating_audio', 'ready', 'failed')),
  title text,
  script text,
  audio_path text,
  audio_paths jsonb,
  mime_type text,
  duration_seconds integer,
  main_language text,
  char_cost integer not null default 0,
  personalization_mode text not null default 'course' check (personalization_mode in ('learner', 'course')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table course_podcasts
  add column if not exists main_language text,
  add column if not exists audio_paths jsonb;

create index if not exists course_podcasts_user_course_created_idx
  on course_podcasts (user_id, course_id, created_at desc);

alter table course_podcasts enable row level security;

drop policy if exists "Users view own course podcasts" on course_podcasts;
create policy "Users view own course podcasts"
  on course_podcasts for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create own course podcasts" on course_podcasts;
create policy "Users create own course podcasts"
  on course_podcasts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own course podcasts" on course_podcasts;
create policy "Users update own course podcasts"
  on course_podcasts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own course podcasts" on course_podcasts;
create policy "Users delete own course podcasts"
  on course_podcasts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'private-podcast-audio',
  'private-podcast-audio',
  false,
  104857600,
  array['audio/wav', 'audio/mpeg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "podcast_audio_select_own" on storage.objects;
create policy "podcast_audio_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'private-podcast-audio'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

drop policy if exists "podcast_audio_insert_own" on storage.objects;
create policy "podcast_audio_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'private-podcast-audio'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

drop policy if exists "podcast_audio_delete_own" on storage.objects;
create policy "podcast_audio_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'private-podcast-audio'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );
