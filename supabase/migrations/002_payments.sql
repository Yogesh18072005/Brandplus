-- Payments + subscription expiry on profiles

alter table public.profiles
  add column if not exists plan_expires_at timestamptz;

create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null check (plan_id in ('starter', 'pro')),
  amount_paise int not null,
  currency text not null default 'INR',
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_razorpay_order on public.payments(razorpay_order_id);

alter table public.payments enable row level security;

create policy "Users can view own payments" on public.payments
  for select using (auth.uid() = user_id);

create policy "Users can create own pending payments" on public.payments
  for insert with check (auth.uid() = user_id and status = 'created');
