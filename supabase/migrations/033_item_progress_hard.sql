alter table item_progress add column if not exists hard boolean not null default false;

create index if not exists idx_item_progress_hard_due
  on item_progress (user_id, course_id, hard, next_review_at);
