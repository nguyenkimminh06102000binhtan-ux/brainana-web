-- ── User subscriptions ────────────────────────────────────────────────────────
-- Stores all billing/plan/quota data separately from user profiles.

create table user_subscriptions (
  user_id                  uuid primary key references profiles(id) on delete cascade,
  plan                     text not null default 'free'
                           check (plan in ('free', 'plus', 'pro')),
  paddle_customer_id       text unique,
  paddle_subscription_id   text unique,
  plan_expires_at          timestamptz,
  chars_balance            integer not null default 0,
  tutor_sessions_balance   integer not null default 0,
  updated_at               timestamptz not null default now()
);

-- Migrate existing plan data from profiles
insert into user_subscriptions (user_id, plan)
select id, coalesce(plan, 'free')
from profiles
on conflict (user_id) do nothing;

-- Drop plan column from profiles — source of truth is now user_subscriptions
alter table profiles drop column if exists plan;

-- Auto-update updated_at
create or replace function update_user_subscriptions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_subscriptions_updated_at
  before update on user_subscriptions
  for each row execute function update_user_subscriptions_updated_at();

-- Auto-create a subscription row when a new profile is created
create or replace function create_user_subscription()
returns trigger as $$
begin
  insert into user_subscriptions (user_id, plan)
  values (new.id, 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on profiles
  for each row execute function create_user_subscription();

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table user_subscriptions enable row level security;

-- Users can read their own subscription
create policy "users_read_own_subscription"
  on user_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

-- Only service role can insert/update/delete (via Paddle webhooks and server actions)
