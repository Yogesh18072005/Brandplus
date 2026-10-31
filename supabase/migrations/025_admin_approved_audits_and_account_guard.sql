-- 025: audits a user requests wait for the founder; credits are charged when
-- the founder runs them (or not, for a comped run); one account per network
-- and per device, with VPN-suspected sign-ups held back from the free audit.
--
-- Raw IPs, fingerprints and timezones never reach Postgres: the app sends
-- scoped HMAC-SHA256 hashes (RATE_LIMIT_SALT) and a boolean VPN signal.
-- Safe to run more than once.

-- ── 1. Founder-approved audit requests ─────────────────────────────────────

alter table public.audit_queue
  add column if not exists requires_approval boolean not null default false,
  add column if not exists requested_by uuid references public.profiles(id) on delete set null,
  add column if not exists credit_mode text,
  add column if not exists approved_at timestamptz,
  add column if not exists credit_charged_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'audit_queue_credit_mode_check' and conrelid = 'public.audit_queue'::regclass
  ) then
    alter table public.audit_queue
      add constraint audit_queue_credit_mode_check check (credit_mode is null or credit_mode in ('charge', 'free'));
  end if;
end $$;

-- One open user request per business, enforced by the database so a double
-- click or two tabs can never queue (and later charge) twice.
create unique index if not exists audit_queue_one_open_request_per_project
  on public.audit_queue(project_id)
  where requires_approval and status in ('pending', 'processing');

create index if not exists audit_queue_awaiting_approval_idx
  on public.audit_queue(created_at)
  where requires_approval and approved_at is null and status = 'pending';

-- Workers (Vercel cron, the admin "Run next" button, `npm run queue`) never
-- pick up a request the founder has not approved.
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
      and (not q.requires_approval or q.approved_at is not null)
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

revoke all on function public.claim_next_audit_job() from public, anon, authenticated;
grant execute on function public.claim_next_audit_job() to service_role;

-- The local runner works one business at a time: claim the next runnable job
-- for this project only, so it never picks up somebody else's request.
create or replace function public.claim_project_audit_job(p_project_id uuid)
returns setof public.audit_queue
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'claim_project_audit_job requires service_role' using errcode = '42501';
  end if;

  return query
  with next_job as (
    select q.id
    from public.audit_queue q
    where q.project_id = p_project_id
      and q.status = 'pending'
      and q.attempts < q.max_attempts
      and q.available_at <= now()
      and (not q.requires_approval or q.approved_at is not null)
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

revoke all on function public.claim_project_audit_job(uuid) from public, anon, authenticated;
grant execute on function public.claim_project_audit_job(uuid) to service_role;

-- Approve a request and, for 'charge', take one credit from the requester in
-- the same transaction. Idempotent: approving twice never charges twice.
create or replace function public.approve_audit_request(p_queue_id uuid, p_mode text)
returns table (ok boolean, reason text, remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job public.audit_queue%rowtype;
  charge record;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'approve_audit_request requires service_role' using errcode = '42501';
  end if;
  if p_mode not in ('charge', 'free') then
    raise exception 'mode must be charge or free' using errcode = '22023';
  end if;

  select * into job from public.audit_queue where id = p_queue_id for update;
  if not found then
    return query select false, 'not_found'::text, null::integer; return;
  end if;
  if job.approved_at is not null then
    return query select true, 'already_approved'::text, null::integer; return;
  end if;
  if job.status <> 'pending' then
    return query select false, ('status_' || job.status)::text, null::integer; return;
  end if;

  if p_mode = 'charge' then
    if job.requested_by is null then
      return query select false, 'no_requester'::text, null::integer; return;
    end if;
    select * into charge from public.reserve_audit_credit(job.requested_by);
    if not charge.ok then
      return query select false, 'no_credit'::text, 0; return;
    end if;
    update public.audit_queue
    set approved_at = now(), credit_mode = 'charge', credit_charged_at = now()
    where id = p_queue_id;
    return query select true, 'charged'::text, charge.remaining; return;
  end if;

  update public.audit_queue
  set approved_at = now(), credit_mode = 'free'
  where id = p_queue_id;
  return query select true, 'free'::text, null::integer;
end;
$$;

revoke all on function public.approve_audit_request(uuid, text) from public, anon, authenticated;
grant execute on function public.approve_audit_request(uuid, text) to service_role;

-- ── 2. One account per network and per device ──────────────────────────────

alter table public.free_signup_credit_claims
  add column if not exists device_hash text,
  add column if not exists vpn_suspected boolean not null default false,
  add column if not exists reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'free_signup_credit_claims_device_hash_check'
      and conrelid = 'public.free_signup_credit_claims'::regclass
  ) then
    alter table public.free_signup_credit_claims
      add constraint free_signup_credit_claims_device_hash_check
      check (device_hash is null or device_hash ~ '^[a-f0-9]{64}$');
  end if;
end $$;

create index if not exists free_signup_credit_claims_network_any_idx
  on public.free_signup_credit_claims(network_hash);
create index if not exists free_signup_credit_claims_device_idx
  on public.free_signup_credit_claims(device_hash);

-- Decide once per profile. An account is held back (no free audit, cannot
-- request one) when its network or device already belongs to another
-- account. A suspected VPN or an unidentifiable network holds it back for now
-- without a final verdict. Returns first_claim = true exactly once, when the
-- verdict is recorded, so the welcome email goes out once.
create or replace function public.claim_account_identity(
  p_profile_id uuid,
  p_network_hash text,
  p_device_hash text,
  p_vpn_suspected boolean
)
returns table (allowed boolean, reason text, first_claim boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  prior public.free_signup_credit_claims%rowtype;
  valid_network boolean := coalesce(p_network_hash ~ '^[a-f0-9]{64}$', false);
  valid_device boolean := coalesce(p_device_hash ~ '^[a-f0-9]{64}$', false);
  decision text;
  granted boolean;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'claim_account_identity requires service_role' using errcode = '42501';
  end if;

  -- Serialize decisions per profile, network and device (fixed order avoids deadlocks).
  perform pg_advisory_xact_lock(hashtextextended('profile:' || p_profile_id::text, 0));
  if valid_network then perform pg_advisory_xact_lock(hashtextextended('network:' || p_network_hash, 0)); end if;
  if valid_device then perform pg_advisory_xact_lock(hashtextextended('device:' || p_device_hash, 0)); end if;

  select * into prior from public.free_signup_credit_claims where profile_id = p_profile_id;
  if found then
    return query select prior.granted, coalesce(prior.reason, case when prior.granted then 'granted' else 'blocked' end), false;
    return;
  end if;

  if not valid_network then
    decision := 'identity_unavailable';
  elsif coalesce(p_vpn_suspected, false) then
    decision := 'vpn_suspected';
  elsif exists (
    select 1 from public.free_signup_credit_claims c
    where c.network_hash = p_network_hash and c.profile_id <> p_profile_id
  ) or exists (
    select 1 from public.free_audit_claims a where a.network_hash = p_network_hash
  ) then
    decision := 'network_used';
  elsif valid_device and exists (
    select 1 from public.free_signup_credit_claims c
    where c.device_hash = p_device_hash and c.profile_id <> p_profile_id
  ) then
    decision := 'device_used';
  else
    decision := 'granted';
  end if;

  -- A VPN or an unidentifiable network is not a final verdict: nothing is
  -- recorded, so the person can switch the VPN off and be checked again.
  if decision in ('vpn_suspected', 'identity_unavailable') then
    return query select false, decision, false;
    return;
  end if;

  granted := decision = 'granted';
  insert into public.free_signup_credit_claims(profile_id, network_hash, device_hash, vpn_suspected, granted, reason)
  values (
    p_profile_id,
    case when valid_network then p_network_hash else null end,
    case when valid_device then p_device_hash else null end,
    coalesce(p_vpn_suspected, false),
    granted,
    decision
  );

  update public.profiles
  set free_credit_status = case when granted then 'granted' else 'blocked' end,
      credits_remaining = case
        when plan = 'free' and granted then greatest(credits_remaining, 1)
        when plan = 'free' then 0
        else credits_remaining
      end,
      credits_reset_at = case when plan = 'free' then null else credits_reset_at end
  where id = p_profile_id;

  return query select granted, decision, true;
end;
$$;

revoke all on function public.claim_account_identity(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.claim_account_identity(uuid, text, text, boolean) to service_role;

-- The old two-per-network rule is superseded; nothing in the app calls it now.
revoke all on function public.claim_free_signup_credit(uuid, text) from service_role;

-- ── 3. The fix plan never reaches a client's database session ───────────────
-- Clients read their report through server pages that use the service role.
-- Their own Clerk token could otherwise query these tables directly through
-- the Supabase REST API and read the fix plan (what we sell) or the engine
-- internals. Drop the owner read policies and every client grant.

do $$
declare
  engine_tables text[] := array[
    'business_understanding_runs','business_profiles','business_source_pages','business_evidence',
    'business_entities','business_entity_evidence','business_conflicts','business_conflict_evidence',
    'business_unknowns','buyer_intent_runs','buyer_question_sets','buyer_questions',
    'ai_observation_runs','ai_question_observations','ai_raw_responses','ai_observed_entities',
    'ai_entity_mentions','ai_observed_sources','ai_citation_observations',
    'evidence_diagnosis_runs','evidence_question_diagnoses','evidence_assessments','evidence_gaps',
    'evidence_gap_support','diagnosis_claims','diagnosed_entity_relationships','diagnosis_unknowns',
    'diagnosis_provenance','intervention_generation_runs','generated_interventions',
    'intervention_question_links','intervention_diagnosis_links','intervention_evidence_links',
    'intervention_inputs','intervention_acceptance_criteria','intervention_dependencies',
    'intervention_measurements','intervention_provenance','intervention_content_briefs',
    'intervention_structured_data','execution_runs','execution_plans','execution_steps',
    'execution_approvals','execution_inputs','execution_artifacts','execution_evidence',
    'execution_events'
  ];
  t text;
  p record;
begin
  foreach t in array engine_tables loop
    if to_regclass('public.' || t) is null then continue; end if;
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
  end loop;
end $$;
