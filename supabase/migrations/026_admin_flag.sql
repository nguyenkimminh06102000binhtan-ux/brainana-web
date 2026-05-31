-- ── Admin flag ────────────────────────────────────────────────────────────────
-- Set manually in Supabase dashboard for admin users only.

alter table profiles add column is_admin boolean not null default false;

-- Security definer function to check admin status without causing
-- infinite recursion in RLS policies
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and is_admin = true
  );
$$;

-- Admins can read all subscriptions
create policy "admins_read_all_subscriptions"
  on user_subscriptions for select
  to authenticated
  using (user_id = auth.uid() or is_admin());

-- Admins can read all quota transactions
create policy "admins_read_all_quota_transactions"
  on quota_transactions for select
  to authenticated
  using (user_id = auth.uid() or is_admin());
