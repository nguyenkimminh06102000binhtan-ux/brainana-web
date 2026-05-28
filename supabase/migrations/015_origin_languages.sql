alter table profiles
  add column if not exists origin_languages text[] not null default '{}';
alter table profiles
  add column if not exists active_origin_language text;

-- Backfill existing users who already have a native language set
update profiles
set
  origin_languages = array[native_language],
  active_origin_language = native_language
where native_language is not null
  and native_language <> ''
  and origin_languages = '{}';
