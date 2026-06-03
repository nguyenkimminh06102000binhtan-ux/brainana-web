-- Keep courses.learner_count in sync with all enrollment rows.
-- Previous app-side recounts could run through user_courses RLS and only see
-- the current user's enrollment, which made public counts drift low.

CREATE OR REPLACE FUNCTION public.sync_learner_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_course_id uuid;
BEGIN
  target_course_id := COALESCE(new.course_id, old.course_id);

  UPDATE public.courses
  SET learner_count = (
    SELECT COUNT(*)
    FROM public.user_courses
    WHERE user_courses.course_id = target_course_id
  )
  WHERE id = target_course_id;

  IF TG_OP = 'UPDATE' AND old.course_id IS DISTINCT FROM new.course_id THEN
    UPDATE public.courses
    SET learner_count = (
      SELECT COUNT(*)
      FROM public.user_courses
      WHERE user_courses.course_id = old.course_id
    )
    WHERE id = old.course_id;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_learner_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_learner_count() FROM anon;
REVOKE ALL ON FUNCTION public.sync_learner_count() FROM authenticated;

DROP TRIGGER IF EXISTS trg_sync_learner_count ON public.user_courses;
CREATE TRIGGER trg_sync_learner_count
AFTER INSERT OR DELETE OR UPDATE OF course_id ON public.user_courses
FOR EACH ROW EXECUTE FUNCTION public.sync_learner_count();

UPDATE public.courses
SET learner_count = counts.enrollment_count
FROM (
  SELECT courses.id, COUNT(user_courses.id)::integer AS enrollment_count
  FROM public.courses
  LEFT JOIN public.user_courses ON user_courses.course_id = courses.id
  GROUP BY courses.id
) AS counts
WHERE courses.id = counts.id
  AND courses.learner_count IS DISTINCT FROM counts.enrollment_count;
