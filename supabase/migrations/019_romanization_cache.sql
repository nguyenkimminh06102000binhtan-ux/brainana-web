alter table courses add column if not exists has_romanization boolean not null default false;

create table if not exists romanization_cache (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  language text not null,
  romanization text not null,
  created_at timestamptz not null default now(),
  unique (text, language)
);

-- Anyone can read cache entries (needed for server actions that run as anon/service role)
alter table romanization_cache enable row level security;

create policy "romanization_cache_read" on romanization_cache
  for select using (true);

create policy "romanization_cache_insert" on romanization_cache
  for insert with check (true);
