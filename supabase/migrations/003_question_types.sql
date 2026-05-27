-- =====================
-- STEP 1: UPDATE ITEMS
-- Add accepted_answers for flexible typing validation
-- Add distractors for pre-authored multiple choice wrong options
-- =====================
alter table items
  add column if not exists accepted_answers text[],
  add column if not exists distractors text[];

-- =====================
-- STEP 2: UPDATE STUDY_SESSIONS
-- Add session_type to distinguish between question modes
-- =====================
alter table study_sessions
  add column if not exists session_type text not null default 'flashcard'
    check (session_type in ('flashcard', 'multiple_choice', 'audio_type', 'speed_match'));
