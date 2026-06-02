-- ── Fix over-broad private storage SELECT policy ─────────────────────────────
-- The original policy let any authenticated user SELECT from private-course-assets,
-- meaning they could enumerate or fetch object metadata for other users' private
-- course files. Restrict to course owners only, matching the DELETE policy.

DROP POLICY IF EXISTS "private_assets_select_auth" ON storage.objects;

CREATE POLICY "private_assets_select_auth"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'private-course-assets'
    AND EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = ((storage.foldername(name))[2])::uuid
        AND courses.creator_id = auth.uid()
    )
  );

-- Also restrict INSERT to the owner's own course paths.
-- Previously any authenticated user could upload to any course's folder.
DROP POLICY IF EXISTS "private_assets_insert_auth" ON storage.objects;

CREATE POLICY "private_assets_insert_auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'private-course-assets'
    AND EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = ((storage.foldername(name))[2])::uuid
        AND courses.creator_id = auth.uid()
    )
  );
