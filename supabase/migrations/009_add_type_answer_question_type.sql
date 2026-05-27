alter table study_sessions
  drop constraint if exists study_sessions_session_type_check;

alter table study_sessions
  add constraint study_sessions_session_type_check
    check (session_type in ('flashcard', 'multiple_choice', 'audio_type', 'speed_match', 'type_answer'));
