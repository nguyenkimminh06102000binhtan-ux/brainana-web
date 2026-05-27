alter table user_courses
  add column if not exists preferred_question_type text not null default 'flashcard'
    check (preferred_question_type in ('flashcard', 'multiple_choice', 'audio_type', 'speed_match'));
