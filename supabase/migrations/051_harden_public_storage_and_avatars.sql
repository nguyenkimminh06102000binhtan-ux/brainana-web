-- Harden public storage writes and define avatar storage policies.
--
-- Public course assets are readable by everyone because the bucket is public,
-- but writes must still be scoped to the authenticated user's own course or
-- draft path. Avatar uploads use the path "{user_id}/avatar.{ext}".

-- ── Public course assets ────────────────────────────────────────────────────
-- Allow these write paths only:
--   courses/{course_id}/items/{file}                 existing saved courses
--   users/{user_id}/courses/{draft_course_id}/items/{file}  create-page drafts

DROP POLICY IF EXISTS "public_assets_insert_auth" ON storage.objects;
CREATE POLICY "public_assets_insert_auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'public-course-assets'
    AND (
      (
        (storage.foldername(name))[1] = 'courses'
        AND (storage.foldername(name))[3] = 'items'
        AND EXISTS (
          SELECT 1
          FROM public.courses
          WHERE courses.id = ((storage.foldername(name))[2])::uuid
            AND courses.creator_id = (SELECT auth.uid())
        )
      )
      OR (
        (storage.foldername(name))[1] = 'users'
        AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
        AND (storage.foldername(name))[3] = 'courses'
        AND (storage.foldername(name))[5] = 'items'
      )
    )
  );

DROP POLICY IF EXISTS "public_assets_update_owner" ON storage.objects;
CREATE POLICY "public_assets_update_owner"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'public-course-assets'
    AND (
      (
        (storage.foldername(name))[1] = 'courses'
        AND EXISTS (
          SELECT 1
          FROM public.courses
          WHERE courses.id = ((storage.foldername(name))[2])::uuid
            AND courses.creator_id = (SELECT auth.uid())
        )
      )
      OR (
        (storage.foldername(name))[1] = 'users'
        AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
      )
    )
  )
  WITH CHECK (
    bucket_id = 'public-course-assets'
    AND (
      (
        (storage.foldername(name))[1] = 'courses'
        AND (storage.foldername(name))[3] = 'items'
        AND EXISTS (
          SELECT 1
          FROM public.courses
          WHERE courses.id = ((storage.foldername(name))[2])::uuid
            AND courses.creator_id = (SELECT auth.uid())
        )
      )
      OR (
        (storage.foldername(name))[1] = 'users'
        AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
        AND (storage.foldername(name))[3] = 'courses'
        AND (storage.foldername(name))[5] = 'items'
      )
    )
  );

DROP POLICY IF EXISTS "public_assets_delete_owner" ON storage.objects;
CREATE POLICY "public_assets_delete_owner"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'public-course-assets'
    AND (
      (
        (storage.foldername(name))[1] = 'courses'
        AND EXISTS (
          SELECT 1
          FROM public.courses
          WHERE courses.id = ((storage.foldername(name))[2])::uuid
            AND courses.creator_id = (SELECT auth.uid())
        )
      )
      OR (
        (storage.foldername(name))[1] = 'users'
        AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
      )
    )
  );

-- ── Avatars ─────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatars_select_all" ON storage.objects;
CREATE POLICY "avatars_select_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND name ~* '^[0-9a-f-]{36}/avatar\.(jpg|jpeg|png|webp)$'
  );

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND name ~* '^[0-9a-f-]{36}/avatar\.(jpg|jpeg|png|webp)$'
  );

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
