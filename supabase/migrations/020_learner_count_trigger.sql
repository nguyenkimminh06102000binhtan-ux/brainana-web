-- Backfill: recalculate learner_count for every course from the source of truth
UPDATE courses
SET learner_count = (
  SELECT COUNT(*) FROM user_courses WHERE user_courses.course_id = courses.id
);

-- Trigger function: keeps learner_count in sync automatically on every enroll/unenroll
CREATE OR REPLACE FUNCTION sync_learner_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_course_id uuid;
BEGIN
  target_course_id := COALESCE(NEW.course_id, OLD.course_id);
  UPDATE courses
  SET learner_count = (
    SELECT COUNT(*) FROM user_courses WHERE user_courses.course_id = target_course_id
  )
  WHERE id = target_course_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_learner_count ON user_courses;
CREATE TRIGGER trg_sync_learner_count
AFTER INSERT OR DELETE ON user_courses
FOR EACH ROW EXECUTE FUNCTION sync_learner_count();
