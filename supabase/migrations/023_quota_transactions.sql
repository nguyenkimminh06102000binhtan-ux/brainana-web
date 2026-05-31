-- ── Quota transactions ────────────────────────────────────────────────────────
-- Full audit log of every credit and debit on a user's quota balance.
-- Never mutate this table — only insert. Balance is on user_subscriptions.

create table quota_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  resource   text not null
             check (resource in ('chars', 'tutor_sessions')),
  amount     integer not null, -- positive = credit, negative = debit
  reason     text not null
             check (reason in (
               'monthly_grant',  -- subscription renewal grant
               'purchase',       -- top-up pack bought
               'usage',          -- feature consumed quota
               'refund',         -- Paddle refund processed
               'chargeback',     -- bank dispute
               'admin_grant',    -- manual admin adjustment
               'compensation'    -- goodwill credits
             )),
  metadata   jsonb,
  -- metadata examples:
  -- purchase:      { "paddle_transaction_id": "...", "pack": "200K chars", "price_usd": 2.99 }
  -- refund:        { "paddle_refund_id": "...", "original_transaction_id": "...", "requested": 200000, "actual_deducted": 50000 }
  -- usage:         { "feature": "ai_import" | "romanization" | "audio" | "back_card", "course_id": "..." }
  -- admin_grant:   { "granted_by": "admin_user_id", "note": "Feature was down for 2 hours" }
  -- monthly_grant: { "plan": "plus", "period": "2026-06" }
  created_at timestamptz not null default now()
);

create index on quota_transactions (user_id, created_at desc);
create index on quota_transactions (created_at desc);
create index on quota_transactions (reason);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table quota_transactions enable row level security;

-- Users can read their own transaction history
create policy "users_read_own_quota_transactions"
  on quota_transactions for select
  to authenticated
  using (user_id = auth.uid());

-- Only service role can insert (all writes go through server-side logic)
