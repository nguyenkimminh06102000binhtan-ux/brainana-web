-- Migration 038 restricted private-course-assets to saved course owners.
-- That works for edit, but create uploads happen before the course row exists.
-- Allow the existing saved-course path and a user-owned draft path:
--   courses/{course_id}/items/{file}
--   users/{user_id}/courses/{draft_course_id}/items/{file}

DROP POLICY IF EXISTS "private_assets_select_auth" ON storage.objects;
DROP POLICY IF EXISTS "private_assets_insert_auth" ON storage.objects;

CREATE POLICY "private_assets_select_auth"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'private-course-assets'
    AND (
      (
        (storage.foldername(name))[1] = 'courses'
        AND EXISTS (
          SELECT 1 FROM courses
          WHERE courses.id = ((storage.foldername(name))[2])::uuid
            AND courses.creator_id = auth.uid()
        )
      )
      OR (
        (storage.foldername(name))[1] = 'users'
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

CREATE POLICY "private_assets_insert_auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'private-course-assets'
    AND (
      (
        (storage.foldername(name))[1] = 'courses'
        AND EXISTS (
          SELECT 1 FROM courses
          WHERE courses.id = ((storage.foldername(name))[2])::uuid
            AND courses.creator_id = auth.uid()
        )
      )
      OR (
        (storage.foldername(name))[1] = 'users'
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );
