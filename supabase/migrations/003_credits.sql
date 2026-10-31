-- D2: audit credits (monthly grant + top-up packs)

-- When the current credit period ends. On/after this, credits reset to the
-- plan's monthlyCredits (no rollover). Null = never initialised → reset on next use.
alter table public.profiles
  add column if not exists credits_reset_at timestamptz;

-- Top-up payments: allow a 'topup' product and record how many credits it grants.
alter table public.payments drop constraint if exists payments_plan_id_check;
alter table public.payments
  add constraint payments_plan_id_check check (plan_id in ('starter', 'pro', 'topup'));
alter table public.payments
  add column if not exists credits_granted int not null default 0;
