alter table item_progress
  add column if not exists last_question_type text;

-- Ensure upsert key exists
alter table item_progress
  drop constraint if exists item_progress_user_id_item_id_key;

alter table item_progress
  add constraint item_progress_user_id_item_id_key unique (user_id, item_id);
