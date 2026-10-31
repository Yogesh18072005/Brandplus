-- Zerociate billing reconciliation: atomic top-up grants and signed refund handling.

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check check (status in ('created', 'paid', 'failed', 'refunded'));

create or replace function public.grant_topup_credits(
  p_user_id uuid,
  p_order_id text,
  p_payment_id text
)
returns table (granted int, remaining int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_row public.payments%rowtype;
  grant_count int;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'grant_topup_credits requires service_role' using errcode = '42501';
  end if;

  select * into payment_row from public.payments
  where user_id = p_user_id and razorpay_order_id = p_order_id
  for update;
  if not found or payment_row.plan_id <> 'topup' then
    raise exception 'top-up order not found' using errcode = 'P0002';
  end if;

  if payment_row.status = 'paid' then
    return query select 0, p.credits_remaining from public.profiles p where p.id = p_user_id;
    return;
  end if;
  if payment_row.status <> 'created' then
    raise exception 'top-up order is not payable' using errcode = 'P0001';
  end if;

  grant_count := greatest(payment_row.credits_granted, 0);
  update public.profiles p
  set credits_remaining = greatest(p.credits_remaining, 0) + grant_count
  where p.id = p_user_id
  returning p.credits_remaining into remaining;
  if remaining is null then raise exception 'profile not found' using errcode = 'P0002'; end if;

  update public.payments
  set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now()
  where id = payment_row.id;
  granted := grant_count;
  return next;
end;
$$;

revoke all on function public.grant_topup_credits(uuid, text, text) from public, anon, authenticated;
grant execute on function public.grant_topup_credits(uuid, text, text) to service_role;

create or replace function public.record_payment_refund(
  p_order_id text,
  p_payment_id text
)
returns table (user_id uuid, product text, entitlement_revoked boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_row public.payments%rowtype;
  has_later_payment boolean;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'record_payment_refund requires service_role' using errcode = '42501';
  end if;

  select * into payment_row from public.payments
  where razorpay_order_id = p_order_id
    and (razorpay_payment_id = p_payment_id or razorpay_payment_id is null)
  for update;
  if not found then raise exception 'payment not found' using errcode = 'P0002'; end if;

  user_id := payment_row.user_id;
  product := payment_row.plan_id;
  entitlement_revoked := false;
  if payment_row.status = 'refunded' then return next; return; end if;

  update public.payments set status = 'refunded' where id = payment_row.id;

  if payment_row.plan_id = 'topup' and payment_row.status = 'paid' then
    update public.profiles p
    set credits_remaining = greatest(0, p.credits_remaining - greatest(payment_row.credits_granted, 0))
    where p.id = payment_row.user_id;
    entitlement_revoked := true;
  elsif payment_row.plan_id in ('starter', 'pro') and payment_row.status = 'paid' then
    select exists(
      select 1 from public.payments later
      where later.user_id = payment_row.user_id
        and later.status = 'paid'
        and later.plan_id in ('starter', 'pro')
        and later.paid_at > payment_row.paid_at
    ) into has_later_payment;
    if not has_later_payment then
      update public.profiles p
      set plan = 'free', plan_expires_at = null,
          credits_remaining = least(greatest(p.credits_remaining, 0), 1),
          credits_reset_at = now() + interval '30 days'
      where p.id = payment_row.user_id and p.plan = payment_row.plan_id;
      entitlement_revoked := found;
    end if;
  end if;
  return next;
end;
$$;

revoke all on function public.record_payment_refund(text, text) from public, anon, authenticated;
grant execute on function public.record_payment_refund(text, text) to service_role;
