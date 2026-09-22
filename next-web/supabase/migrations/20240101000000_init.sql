-- SherPay target schema (minimal)
-- Tables: profiles, expenses, income, transactions, categories

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid references auth.users on delete cascade not null,
  user_id uuid not null,
  email text not null,
  full_name text,
  avatar_url text,
  currency text default 'USD',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  primary key (id)
);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text check (type in ('expense', 'income')) not null,
  color text default '#3b82f6',
  icon text default 'tag',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  primary key (id),
  unique (user_id, name, type)
);

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
create table public.expenses (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  amount numeric(12, 2) not null,
  category_id uuid references public.categories on delete set null,
  category text,
  date date not null default current_date,
  vendor text,
  payment_method text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  primary key (id)
);

-- ---------------------------------------------------------------------------
-- income
-- ---------------------------------------------------------------------------
create table public.income (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  amount numeric(12, 2) not null,
  category_id uuid references public.categories on delete set null,
  category text,
  date date not null default current_date,
  source text,
  payment_method text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  primary key (id)
);

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  type text check (type in ('income', 'expense')) not null,
  amount numeric(12, 2) not null,
  category_id uuid references public.categories on delete set null,
  category text,
  date date not null default current_date,
  reference_id uuid,
  reference_type text check (reference_type in ('expense', 'income')),
  payment_method text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  primary key (id)
);

-- ---------------------------------------------------------------------------
-- indexes
-- ---------------------------------------------------------------------------
create index idx_profiles_user_id on public.profiles (user_id);
create index idx_categories_user_id on public.categories (user_id);
create index idx_expenses_user_id on public.expenses (user_id);
create index idx_expenses_date on public.expenses (date);
create index idx_income_user_id on public.income (user_id);
create index idx_income_date on public.income (date);
create index idx_transactions_user_id on public.transactions (user_id);
create index idx_transactions_date on public.transactions (date);
-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.handle_updated_at();

create trigger trg_expenses_updated_at
  before update on public.expenses
  for each row execute function public.handle_updated_at();

create trigger trg_income_updated_at
  before update on public.income
  for each row execute function public.handle_updated_at();

create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.income enable row level security;
alter table public.transactions enable row level security;

create policy "profiles: users can view own profile"
  on public.profiles for select using (auth.uid() = user_id);

create policy "profiles: users can insert own profile"
  on public.profiles for insert with check (auth.uid() = user_id);

create policy "profiles: users can update own profile"
  on public.profiles for update using (auth.uid() = user_id);

create policy "categories: users can manage own categories"
  on public.categories for all using (auth.uid() = user_id);

create policy "expenses: users can manage own expenses"
  on public.expenses for all using (auth.uid() = user_id);

create policy "income: users can manage own income"
  on public.income for all using (auth.uid() = user_id);

create policy "transactions: users can manage own transactions"
  on public.transactions for all using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- auto-create profile on auth signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
as $$
begin
  insert into public.profiles (id, user_id, email)
  values (new.id, new.id, new.email);
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

