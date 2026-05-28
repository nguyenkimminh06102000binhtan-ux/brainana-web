alter table profiles
  add column if not exists show_romanization boolean not null default true;
