-- Switch payment provider from Paddle to LemonSqueezy.
-- Rename the provider-specific ID columns; no data loss since they are all null.
alter table user_subscriptions
  rename column paddle_customer_id     to lemon_customer_id;

alter table user_subscriptions
  rename column paddle_subscription_id to lemon_subscription_id;

-- Update the RLS comment to reflect the correct provider.
comment on table user_subscriptions is
  'Billing, plan, and quota data. Insert/update/delete via LemonSqueezy webhooks and server actions (service role only).';
