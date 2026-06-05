-- Add mastered_at to item_progress for mastery-velocity analytics.
-- Without a dedicated timestamp we can only proxy via last_reviewed_at, which
-- is updated on every review (including post-mastery). Having a real column
-- lets the velocity chart show when cards were actually conquered.

alter table item_progress
  add column if not exists mastered_at timestamptz;

-- Backfill existing mastered cards using last_reviewed_at as a proxy.
update item_progress
  set mastered_at = last_reviewed_at
  where mastered     = true
    and mastered_at  is null
    and last_reviewed_at is not null;

-- Auto-stamp mastered_at the first time mastered flips to true.
create or replace function trg_fn_set_mastered_at()
  returns trigger
  language plpgsql
as $$
begin
  if new.mastered = true and (old.mastered is distinct from true) then
    new.mastered_at := coalesce(new.mastered_at, now());
  end if;
  return new;
end;
$$;

create trigger trg_item_progress_mastered_at
  before update on item_progress
  for each row
  execute function trg_fn_set_mastered_at();
