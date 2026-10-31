-- P0: keep billing/audit execution writes behind trusted server code and make
-- queue claims safe when more than one worker is running.

-- A signed-in browser may edit only the two customer-facing profile fields.
-- Billing/entitlement fields remain writable by the service role used by the
-- verified payment and credit code paths.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update on table public.profiles from anon, authenticated;
grant update (full_name, company_name) on table public.profiles to authenticated;

-- Project/audit creation and queue insertion must pass through authenticated
-- APIs, where ownership, plan limits, credits and priority are enforced. The
-- service role still bypasses RLS and retains its existing table privileges.
drop policy if exists "Users can create projects" on public.projects;
drop policy if exists "Users can create audits" on public.audits;
drop policy if exists "Users can create queue items" on public.audit_queue;
revoke insert on table public.projects from anon, authenticated;
revoke insert on table public.audits from anon, authenticated;
revoke insert on table public.audit_queue from anon, authenticated;

-- Older workers parked spend-capped jobs in retry_later permanently. Return
-- only those known cap deferrals to pending; the new worker releases them to
-- pending without consuming an attempt, so they recover when the cap changes.
update public.audit_queue as stalled
set status = 'pending',
    attempts = greatest(attempts - 1, 0),
    started_at = null
where stalled.status = 'retry_later'
  and stalled.error like 'Global spend cap %'
  and not exists (
    select 1
    from public.audit_queue as active
    where active.project_id = stalled.project_id
      and active.id <> stalled.id
      and active.status in ('pending', 'processing')
  );

-- The API performs a friendly pre-check, while this index is the authoritative
-- concurrency guard against two active runs for the same project.
-- Clean up any legacy duplicates first so the migration itself cannot fail on
-- data created before the guard existed. Keep the highest-priority oldest row.
with ranked_active as (
  select
    q.audit_id,
    row_number() over (
      partition by q.project_id
      order by q.priority desc, q.created_at asc, q.id asc
    ) as position
  from public.audit_queue as q
  where q.status in ('pending', 'processing')
)
update public.audits as a
set status = 'failed',
    completed_at = coalesce(a.completed_at, now())
from ranked_active as duplicate
where duplicate.position > 1
  and duplicate.audit_id = a.id
  and a.report_data is null;

with ranked_active as (
  select
    q.id,
    row_number() over (
      partition by q.project_id
      order by q.priority desc, q.created_at asc, q.id asc
    ) as position
  from public.audit_queue as q
  where q.status in ('pending', 'processing')
)
update public.audit_queue as q
set status = 'failed',
    error = coalesce(q.error, 'Closed duplicate active job during P0 migration'),
    completed_at = coalesce(q.completed_at, now())
from ranked_active as duplicate
where duplicate.position > 1
  and duplicate.id = q.id;

create unique index if not exists idx_audit_queue_one_active_per_project
  on public.audit_queue (project_id)
  where status in ('pending', 'processing');

-- Reserve one credit while holding the profile row lock. This folds lazy period
-- reset + effective-plan resolution + decrement into one transaction, so two
-- simultaneous API requests can never spend the same credit.
create or replace function public.reserve_audit_credit(p_user_id uuid)
returns table (ok boolean, remaining integer, plan text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_row public.profiles%rowtype;
  effective_plan text;
  available integer;
  reset_at timestamptz;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'reserve_audit_credit requires service_role'
      using errcode = '42501';
  end if;

  select p.*
  into profile_row
  from public.profiles as p
  where p.id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  effective_plan := case
    when profile_row.plan in ('starter', 'pro')
      and (profile_row.plan_expires_at is null or profile_row.plan_expires_at > now())
      then profile_row.plan
    else 'free'
  end;

  if profile_row.credits_reset_at is null or profile_row.credits_reset_at <= now() then
    available := case effective_plan when 'pro' then 6 when 'starter' then 2 else 1 end;
    reset_at := now() + interval '30 days';
  else
    available := greatest(profile_row.credits_remaining, 0);
    reset_at := profile_row.credits_reset_at;
  end if;

  if available <= 0 then
    update public.profiles
    set credits_remaining = 0,
        credits_reset_at = reset_at
    where id = p_user_id;
    return query select false, 0, effective_plan;
    return;
  end if;

  available := available - 1;
  update public.profiles
  set credits_remaining = available,
      credits_reset_at = reset_at
  where id = p_user_id;

  return query select true, available, effective_plan;
end;
$$;

-- Queue insertion can fail after a successful reservation (for example, the
-- active-project unique index wins a race). Refund via an atomic increment.
create or replace function public.refund_audit_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_balance integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'refund_audit_credit requires service_role'
      using errcode = '42501';
  end if;

  update public.profiles
  set credits_remaining = credits_remaining + 1
  where id = p_user_id
  returning credits_remaining into new_balance;

  if new_balance is null then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  return new_balance;
end;
$$;

revoke all on function public.reserve_audit_credit(uuid) from public, anon, authenticated;
revoke all on function public.refund_audit_credit(uuid) from public, anon, authenticated;
grant execute on function public.reserve_audit_credit(uuid) to service_role;
grant execute on function public.refund_audit_credit(uuid) to service_role;

-- Atomically select and claim one job. FOR UPDATE SKIP LOCKED means concurrent
-- workers cannot receive the same queue row. Returning the updated row also
-- gives the worker the incremented attempt count used by retry handling.
create or replace function public.claim_next_audit_job()
returns setof public.audit_queue
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'claim_next_audit_job requires service_role'
      using errcode = '42501';
  end if;

  return query
  with next_job as (
    select q.id
    from public.audit_queue as q
    where q.status = 'pending'
      and q.attempts < q.max_attempts
    order by q.priority desc, q.created_at asc
    for update skip locked
    limit 1
  )
  update public.audit_queue as q
  set status = 'processing',
      attempts = q.attempts + 1,
      started_at = now(),
      completed_at = null,
      error = null
  from next_job
  where q.id = next_job.id
  returning q.*;
end;
$$;

revoke all on function public.claim_next_audit_job() from public, anon, authenticated;
grant execute on function public.claim_next_audit_job() to service_role;
