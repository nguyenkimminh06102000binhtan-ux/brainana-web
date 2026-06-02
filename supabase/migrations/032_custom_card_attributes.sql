alter table sections
  add column if not exists custom_attributes text[] default null;

alter table items
  add column if not exists custom_attributes jsonb default null;
