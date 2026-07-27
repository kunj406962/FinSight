-- ACCOUNTS
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  account_type text not null check (account_type in ('chequing', 'savings', 'credit_card', 'other')),
  created_at timestamptz not null default now()
);

-- UPLOAD_BATCHES
create table upload_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  filename text not null,
  bank_detected text not null,
  transaction_count int not null default 0,
  uploaded_at timestamptz not null default now()
);

-- TRANSACTIONS
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid not null references upload_batches(id) on delete cascade,
  date date not null,
  description text not null,
  amount numeric not null,
  category text not null check (category in ('Food', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Income', 'Other')),
  account_type text not null,
  is_anomaly boolean not null default false,
  anomaly_score numeric,
  created_at timestamptz not null default now()
);

create table category_overrides (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id),
    description text not null,
    category text not null,
    updated_at timestamp with time zone default now(),
    unique (user_id, description)
);

alter table category_overrides disable row level security;

alter table transactions drop constraint transactions_category_check;

alter table transactions add constraint transactions_category_check
  check (category in (
    'Food', 'Groceries', 'Transport', 'Utilities', 'Entertainment',
    'Health', 'Shopping', 'Income', 'Transfer', 'Savings',
    'Rent/Mortgage', 'Education', 'Other'
  ));

alter table transactions add column account_id uuid references accounts(id);

update transactions t
set account_id = ub.account_id
from upload_batches ub
where t.batch_id = ub.id;

alter table transactions alter column account_id set not null;

create table forecast_cache (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id),
    category text not null,
    target_month date not null,  -- first-of-month
    insufficient_data boolean not null default false,
    predicted_amount float,
    lower_bound float,
    upper_bound float,
    computed_at timestamp with time zone default now(),
    unique (user_id, category, target_month)
);

alter table forecast_cache disable row level security;

-- Indexes for direct user_id scoping (every query filters on this first)
create index idx_accounts_user_id on accounts(user_id);
create index idx_upload_batches_user_id on upload_batches(user_id);
create index idx_transactions_user_id on transactions(user_id);
create index idx_transactions_batch_id on transactions(batch_id);
create index idx_transactions_account_id on transactions(account_id);