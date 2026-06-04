-- Abandon AI course podcasts.
-- Keep migration history intact by removing the schema/storage added in 052.

drop table if exists public.course_podcasts cascade;

drop policy if exists "podcast_audio_select_own" on storage.objects;
drop policy if exists "podcast_audio_insert_own" on storage.objects;
drop policy if exists "podcast_audio_delete_own" on storage.objects;

-- Supabase blocks direct deletes from storage.objects/storage.buckets.
-- Remove any files and the private-podcast-audio bucket through the Storage API
-- or Supabase dashboard after this migration if cleanup is needed.
