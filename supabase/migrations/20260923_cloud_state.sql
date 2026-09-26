-- SherPay cloud sync: one document per user holding their whole workspace.
-- Last-write-wins by updated_at; conflicts archived client-side before overwrite.
-- Apply in Supabase Dashboard → SQL Editor (or `supabase db push`).
create table if not exists public.cloud_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.cloud_state enable row level security;

create policy "users manage own cloud state"
  on public.cloud_state for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
