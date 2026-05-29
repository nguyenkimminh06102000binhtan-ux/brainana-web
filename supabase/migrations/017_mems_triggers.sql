-- Trigger: keep mems.helpful_count in sync with mem_votes rows
create or replace function sync_mem_helpful_count()
returns trigger language plpgsql security definer as $$
begin
  if (TG_OP = 'INSERT') then
    update mems set helpful_count = helpful_count + 1 where id = NEW.mem_id;
  elsif (TG_OP = 'DELETE') then
    update mems set helpful_count = greatest(0, helpful_count - 1) where id = OLD.mem_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_mem_votes_count on mem_votes;
create trigger trg_mem_votes_count
after insert or delete on mem_votes
for each row execute function sync_mem_helpful_count();

-- Trigger: keep courses.mems_count in sync with mems rows
create or replace function sync_course_mems_count()
returns trigger language plpgsql security definer as $$
declare
  v_course_id uuid;
begin
  if (TG_OP = 'INSERT') then
    select course_id into v_course_id from items where id = NEW.card_id;
    if v_course_id is not null then
      update courses set mems_count = mems_count + 1 where id = v_course_id;
    end if;
  elsif (TG_OP = 'DELETE') then
    select course_id into v_course_id from items where id = OLD.card_id;
    if v_course_id is not null then
      update courses set mems_count = greatest(0, mems_count - 1) where id = v_course_id;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_mems_count on mems;
create trigger trg_mems_count
after insert or delete on mems
for each row execute function sync_course_mems_count();
