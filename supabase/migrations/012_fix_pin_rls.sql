-- The original update policy only allowed post authors to update their own posts.
-- Course creators need to be able to update the `pinned` field on any post in their course.
drop policy if exists "course_posts_update" on course_posts;

create policy "course_posts_update" on course_posts
  for update to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from courses
      where courses.id = course_posts.course_id
        and courses.creator_id = auth.uid()
    )
  );
