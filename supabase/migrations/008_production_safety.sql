-- Zerociate Phase 1: production safety.
--
-- 1. Full audit data is tenant-private at the database layer.
-- 2. Shared rate limits work across serverless instances.
-- 3. Queue jobs expose heartbeats and can recover from dead workers.
-- 4. Operational events and scheduler runs provide failure visibility.

-- Completed reports are rendered by the trusted Next.js server. Anonymous
-- clients must never be able to read report_data or individual answers through
-- Supabase REST, even if they know an audit UUID and the public anon key.
drop policy if exists "Anyone can view audits by id for public reports" on public.audits;
drop policy if exists "Anyone can view results for completed audits" on public.audit_results;
revoke select on table public.audits from anon;
revoke select on table public.audit_results from anon;

-- Make the existing ownership policies explicit for authenticated users.
drop policy if exists "Users can view own audits" on public.audits;
create policy "Users can view own audits"
  on public.audits for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = audits.project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view own audit results" on public.audit_results;
create policy "Users can view own audit results"
  on public.audit_results for select to authenticated
  using (
    exists (
      select 1
      from public.audits a
      join public.projects p on p.id = a.project_id
      where a.id = audit_results.audit_id and p.user_id = auth.uid()
    )
  );

-- Shared fixed-window rate limiting. Keys are hashed by the application before
-- storage, so raw email addresses and IP addresses are not retained here.
create table if not exists public.rate_limit_buckets (
  scope text not null,
  key_hash text not null,
  window_start timestamptz not null,
  request_count int not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash, window_start)
);

alter table public.rate_limit_buckets enable row level security;
revoke all on table public.rate_limit_buckets from anon, authenticated;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit int,
  p_window_seconds int
)
returns table (allowed boolean, remaining int, reset_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz;
  next_count int;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'consume_rate_limit requires service_role' using errcode = '42501';
  end if;
  if p_limit < 1 or p_window_seconds < 1 or length(p_scope) > 80 or length(p_key_hash) > 128 then
    raise exception 'invalid rate-limit configuration' using errcode = '22023';
  end if;

  current_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_buckets(scope, key_hash, window_start, request_count)
  values (p_scope, p_key_hash, current_window, 1)
  on conflict (scope, key_hash, window_start)
  do update set request_count = public.rate_limit_buckets.request_count + 1,
                updated_at = now()
  returning request_count into next_count;

  return query select
    next_count <= p_limit,
    greatest(p_limit - next_count, 0),
    current_window + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.consume_rate_limit(text, text, int, int) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, int, int) to service_role;

-- A low-volume event stream for operational health. Never store API keys,
-- payment signatures, answer bodies, or customer form payloads in metadata.
create table if not exists public.operational_events (
  id uuid primary key default extensions.uuid_generate_v4(),
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'error')),
  project_id uuid references public.projects(id) on delete set null,
  audit_id uuid references public.audits(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_operational_events_type_created
  on public.operational_events(event_type, created_at desc);
alter table public.operational_events enable row level security;
revoke all on table public.operational_events from anon, authenticated;

create table if not exists public.scheduler_runs (
  id uuid primary key default extensions.uuid_generate_v4(),
  job_name text not null,
  status text not null check (status in ('running', 'completed', 'failed')),
  queued_count int not null default 0,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_scheduler_runs_job_started
  on public.scheduler_runs(job_name, started_at desc);
alter table public.scheduler_runs enable row level security;
revoke all on table public.scheduler_runs from anon, authenticated;

alter table public.audit_queue
  add column if not exists available_at timestamptz not null default now(),
  add column if not exists last_heartbeat_at timestamptz;

create index if not exists idx_audit_queue_available
  on public.audit_queue(status, available_at, priority desc, created_at asc);

-- Replace the claim function so retried jobs can use backoff and workers leave
-- a heartbeat immediately when taking ownership.
create or replace function public.claim_next_audit_job()
returns setof public.audit_queue
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'claim_next_audit_job requires service_role' using errcode = '42501';
  end if;

  return query
  with next_job as (
    select q.id
    from public.audit_queue q
    where q.status = 'pending'
      and q.attempts < q.max_attempts
      and q.available_at <= now()
    order by q.priority desc, q.created_at asc
    for update skip locked
    limit 1
  )
  update public.audit_queue q
  set status = 'processing',
      attempts = q.attempts + 1,
      started_at = now(),
      last_heartbeat_at = now(),
      completed_at = null,
      error = null
  from next_job
  where q.id = next_job.id
  returning q.*;
end;
$$;

-- Recover a claim abandoned by a crashed worker. Jobs below max attempts return
-- to pending with exponential backoff; exhausted jobs become visible failures.
create or replace function public.recover_stale_audit_jobs(p_stale_minutes int default 15)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed int;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'recover_stale_audit_jobs requires service_role' using errcode = '42501';
  end if;
  if p_stale_minutes < 5 or p_stale_minutes > 1440 then
    raise exception 'invalid stale threshold' using errcode = '22023';
  end if;

  update public.audit_queue q
  set status = case when q.attempts < q.max_attempts then 'pending' else 'failed' end,
      available_at = case
        when q.attempts < q.max_attempts then now() + make_interval(secs => least(900, 30 * (2 ^ greatest(q.attempts - 1, 0))))
        else q.available_at
      end,
      started_at = case when q.attempts < q.max_attempts then null else q.started_at end,
      completed_at = case when q.attempts < q.max_attempts then null else now() end,
      error = 'Worker heartbeat expired; job recovered automatically'
  where q.status = 'processing'
    and coalesce(q.last_heartbeat_at, q.started_at, q.created_at) < now() - make_interval(mins => p_stale_minutes);

  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.recover_stale_audit_jobs(int) from public, anon, authenticated;
grant execute on function public.recover_stale_audit_jobs(int) to service_role;

-- Keep rate-limit storage bounded without requiring application code to scan it.
create or replace function public.cleanup_expired_rate_limits()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed int;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'cleanup_expired_rate_limits requires service_role' using errcode = '42501';
  end if;
  delete from public.rate_limit_buckets where window_start < now() - interval '2 days';
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.cleanup_expired_rate_limits() from public, anon, authenticated;
grant execute on function public.cleanup_expired_rate_limits() to service_role;
