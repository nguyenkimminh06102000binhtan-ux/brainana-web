-- ─────────────────────────────────────────────────────────────────────────────
-- Course asset storage buckets + RLS policies
--
-- Two buckets:
--   public-course-assets  – images/audio for public & unlisted courses.
--                           Objects served via CDN public URL (no auth needed).
--   private-course-assets – images/audio for private courses.
--                           Objects served via short-lived signed URLs only.
--
-- Path convention used by the application:
--   courses/{courseId}/items/{uuid}.{ext}
--
-- This means (storage.foldername(name))[2] == courseId, which lets the
-- DELETE policies verify ownership via the courses table.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Buckets ────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit)
values (
  'public-course-assets',
  'public-course-assets',
  true,
  10485760   -- 10 MB
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values (
  'private-course-assets',
  'private-course-assets',
  false,
  10485760   -- 10 MB
)
on conflict (id) do nothing;

-- ── 2. public-course-assets policies ─────────────────────────────────────────

-- Anyone (including anonymous) can read objects in the public bucket.
drop policy if exists "public_assets_select_all" on storage.objects;
create policy "public_assets_select_all"
  on storage.objects for select
  using (bucket_id = 'public-course-assets');

-- Any authenticated user may upload (the application enforces the correct path).
drop policy if exists "public_assets_insert_auth" on storage.objects;
create policy "public_assets_insert_auth"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'public-course-assets');

-- Only the course creator may delete their own files.
-- (storage.foldername(name))[2] extracts the courseId segment from the path
-- courses/{courseId}/items/{filename}.
drop policy if exists "public_assets_delete_owner" on storage.objects;
create policy "public_assets_delete_owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'public-course-assets'
    and exists (
      select 1 from courses
      where courses.id = ((storage.foldername(name))[2])::uuid
        and courses.creator_id = auth.uid()
    )
  );

-- ── 3. private-course-assets policies ────────────────────────────────────────

-- Any authenticated user may generate signed URLs for objects they know the
-- path of. The path contains a random UUID so paths are hard to guess.
-- Application-layer access control ensures private courses are only shown to
-- their creator.
drop policy if exists "private_assets_select_auth" on storage.objects;
create policy "private_assets_select_auth"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'private-course-assets');

-- Any authenticated user may upload.
drop policy if exists "private_assets_insert_auth" on storage.objects;
create policy "private_assets_insert_auth"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'private-course-assets');

-- Only the course creator may delete their own files.
-- Used by the server-side migration when a course is made public.
drop policy if exists "private_assets_delete_owner" on storage.objects;
create policy "private_assets_delete_owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'private-course-assets'
    and exists (
      select 1 from courses
      where courses.id = ((storage.foldername(name))[2])::uuid
        and courses.creator_id = auth.uid()
    )
  );
