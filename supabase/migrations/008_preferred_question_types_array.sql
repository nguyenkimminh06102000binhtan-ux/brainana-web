alter table user_courses
  drop column if exists preferred_question_type;

alter table user_courses
  add column if not exists preferred_question_types text[] not null default '{flashcard}';
