-- SherPay user-isolation hardening (idempotent — safe to re-run)
-- One project, per-row ownership: every row carries user_id = auth.uid().
-- RLS is the enforcement point; app .eq("user_id", user.id) filters are
-- defense-in-depth only. Run: supabase db push (or paste in SQL Editor).

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.income enable row level security;
alter table public.transactions enable row level security;
alter table public.cloud_state enable row level security;

-- Drop the old loose FOR ALL policies: USING-only lets a user UPDATE
-- someone else's row by moving it under their own user_id, and gives no
-- WITH CHECK on INSERT. Recreated below, split per operation.
drop policy if exists "profiles: users can view own profile" on public.profiles;
drop policy if exists "profiles: users can insert own profile" on public.profiles;
drop policy if exists "profiles: users can update own profile" on public.profiles;
drop policy if exists "categories: users can manage own categories" on public.categories;
drop policy if exists "expenses: users can manage own expenses" on public.expenses;
drop policy if exists "income: users can manage own income" on public.income;
drop policy if exists "transactions: users can manage own transactions" on public.transactions;
drop policy if exists "users manage own cloud state" on public.cloud_state;
-- also drop our own per-operation policies so the file is safe to re-run
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
drop policy if exists "categories_select_own" on public.categories;
drop policy if exists "categories_insert_own" on public.categories;
drop policy if exists "categories_update_own" on public.categories;
drop policy if exists "categories_delete_own" on public.categories;
drop policy if exists "expenses_select_own" on public.expenses;
drop policy if exists "expenses_insert_own" on public.expenses;
drop policy if exists "expenses_update_own" on public.expenses;
drop policy if exists "expenses_delete_own" on public.expenses;
drop policy if exists "income_select_own" on public.income;
drop policy if exists "income_insert_own" on public.income;
drop policy if exists "income_update_own" on public.income;
drop policy if exists "income_delete_own" on public.income;
drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;
drop policy if exists "cloud_state_select_own" on public.cloud_state;
drop policy if exists "cloud_state_insert_own" on public.cloud_state;
drop policy if exists "cloud_state_update_own" on public.cloud_state;
drop policy if exists "cloud_state_delete_own" on public.cloud_state;

create policy "profiles_select_own" on public.profiles for select
  to authenticated using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles for insert
  to authenticated with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles for delete
  to authenticated using (auth.uid() = user_id);

create policy "categories_select_own" on public.categories for select
  to authenticated using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories for insert
  to authenticated with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories for delete
  to authenticated using (auth.uid() = user_id);

create policy "expenses_select_own" on public.expenses for select
  to authenticated using (auth.uid() = user_id);
create policy "expenses_insert_own" on public.expenses for insert
  to authenticated with check (auth.uid() = user_id);
create policy "expenses_update_own" on public.expenses for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses_delete_own" on public.expenses for delete
  to authenticated using (auth.uid() = user_id);
create policy "income_select_own" on public.income for select
  to authenticated using (auth.uid() = user_id);
create policy "income_insert_own" on public.income for insert
  to authenticated with check (auth.uid() = user_id);
create policy "income_update_own" on public.income for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "income_delete_own" on public.income for delete
  to authenticated using (auth.uid() = user_id);

create policy "transactions_select_own" on public.transactions for select
  to authenticated using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert
  to authenticated with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions for delete
  to authenticated using (auth.uid() = user_id);

-- cloud_state (legacy offline-app workspace doc keyed by user_id): same
-- per-owner shape so one account can never read/overwrite another's sync.
create policy "cloud_state_select_own" on public.cloud_state for select
  to authenticated using (auth.uid() = user_id);
create policy "cloud_state_insert_own" on public.cloud_state for insert
  to authenticated with check (auth.uid() = user_id);
create policy "cloud_state_update_own" on public.cloud_state for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cloud_state_delete_own" on public.cloud_state for delete
  to authenticated using (auth.uid() = user_id);

