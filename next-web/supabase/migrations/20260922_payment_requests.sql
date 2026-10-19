-- SherPay real payments: public, anonymous payment requests for hosted checkout links.
-- Apply in Supabase Dashboard → SQL Editor (or `supabase db push`).
create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  payload jsonb not null,                -- invoice snapshot: number, items, totals, client, business, paystackPublicKey
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  reference text,                        -- Paystack transaction reference
  amount_paid numeric(12, 2),
  currency text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.payment_requests enable row level security;

-- Clients (anyone with the link) may create a checkout request and read its status.
-- Only the pay-verify edge function (service role) may mark rows paid.
create policy "anon can create payment requests"
  on public.payment_requests for insert to anon with check (true);

create policy "anon can read payment requests"
  on public.payment_requests for select to anon using (true);

create index if not exists idx_payment_requests_token on public.payment_requests (token);
