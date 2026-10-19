-- SherPay Pro upgrades paid with Mobile Money: one row per payment reference.
-- Apply with `supabase db push` or paste into Supabase SQL Editor.
--
-- `reference` and `paystack_reference` are the public/internal ledger names.
-- The generated aliases `ref` and `provider_reference` keep the shared
-- checkout/order code explicit without allowing the aliases to drift.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  reference text not null unique,
  email text not null,
  plan text not null default 'pro' check (plan = 'pro'),
  billing text not null default 'annual',
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'GHS' check (currency = 'GHS'),
  status text not null default 'created'
    check (status in ('created', 'pending', 'awaiting_approval', 'paid', 'failed', 'expired')),
  payment_method text not null default 'mobile_money',
  paystack_reference text not null unique,
  ref text generated always as (reference) stored,
  provider_reference text generated always as (paystack_reference) stored,
  provider text not null default 'paystack',
  provider_tx_id text,
  provider_channel text,
  channel text not null default 'mobile_money',
  momo_provider text check (momo_provider in ('mtn', 'telecel', 'at')),
  momo_number text,
  checkout_url text,
  note text,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_checked_at timestamptz,
  expires_at timestamptz,
  paid_at timestamptz,
  granted_at timestamptz,
  amount_paid numeric(12, 2)
);

create index if not exists idx_payments_user_created on public.payments (user_id, created_at desc);
create index if not exists idx_payments_email on public.payments (lower(email));
create index if not exists idx_payments_open on public.payments (status, created_at desc);

alter table public.payments enable row level security;
revoke all on public.payments from public, anon, authenticated;
grant all on public.payments to service_role;

-- No browser policies: the service-role Edge Function is the only writer and
-- reader. It verifies each Paystack transaction before marking it paid and
-- granting the plan. Customers only receive a redacted order from that function.
