-- Engine 06: controlled execution of finalized Engine 05 interventions.
-- Additive only. No external publishing integration is introduced here.

create table public.execution_runs (
  id uuid primary key default extensions.uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  intervention_id uuid not null,
  intervention_run_id uuid not null,
  diagnosis_run_id uuid not null,
  observation_run_id uuid not null,
  buyer_question_set_id uuid not null,
  business_understanding_run_id uuid not null,
  active_plan_id uuid,
  status text not null check (status in ('PLANNED','READY','WAITING_FOR_INPUT','WAITING_FOR_APPROVAL','QUEUED','RUNNING','SUCCEEDED','PARTIALLY_SUCCEEDED','FAILED','BLOCKED','MANUAL_REQUIRED','CANCELLED','UNKNOWN')),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 128),
  execution_key text not null check (execution_key ~ '^[0-9a-f]{64}$'),
  retry_of_execution_id uuid,
  attempt_number integer not null default 1 check (attempt_number between 1 and 100),
  provider_call_count integer not null default 0 check (provider_call_count >= 0),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  estimated_cost_usd numeric(14,8) not null default 0 check (estimated_cost_usd >= 0),
  external_cost_usd numeric(14,8) not null default 0 check (external_cost_usd >= 0),
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, project_id),
  unique (project_id, idempotency_key),
  unique (execution_key, attempt_number),
  foreign key (intervention_id, project_id) references public.generated_interventions(id, project_id) on delete restrict,
  foreign key (intervention_run_id, project_id) references public.intervention_generation_runs(id, project_id) on delete restrict,
  foreign key (retry_of_execution_id, project_id) references public.execution_runs(id, project_id) on delete restrict
);

create unique index idx_execution_active_operation on public.execution_runs(execution_key)
  where status not in ('FAILED','CANCELLED','UNKNOWN','PARTIALLY_SUCCEEDED');
create index idx_execution_project_created on public.execution_runs(project_id, created_at desc);
create index idx_execution_status_created on public.execution_runs(status, created_at);

create table public.execution_plans (
  id uuid primary key default extensions.uuid_generate_v4(),
  execution_id uuid not null,
  project_id uuid not null,
  plan_version integer not null check (plan_version between 1 and 100),
  intervention_id uuid not null,
  intervention_key text not null,
  diagnosis_key text not null,
  affected_questions jsonb not null,
  intervention_type text not null,
  target_surface text not null,
  adapter_id text not null check (adapter_id in ('WEBSITE_CONTENT_DRAFT','WEBSITE_STRUCTURED_DATA_DRAFT','PROFILE_UPDATE_DRAFT','CONTENT_BRIEF_ARTIFACT','MANUAL_EXECUTION_PACKAGE')),
  adapter_version text not null,
  required_permissions jsonb not null default '[]'::jsonb,
  required_inputs jsonb not null default '[]'::jsonb,
  payload jsonb not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  prerequisites jsonb not null default '[]'::jsonb,
  approval_status text not null check (approval_status in ('NO_APPROVAL','REQUIRED_APPROVAL')),
  acceptance_criteria jsonb not null default '[]'::jsonb,
  risk text not null check (risk in ('LOW','MEDIUM','HIGH','CRITICAL')),
  retry_safety text not null check (retry_safety in ('SAFE_TO_RETRY','UNSAFE_TO_RETRY','UNKNOWN')),
  rollback jsonb not null,
  engine_version text not null,
  schema_version text not null,
  payload_version text not null,
  content_generation_version text,
  upstream_versions jsonb not null,
  created_at timestamptz not null default now(),
  unique (id, project_id),
  unique (execution_id, plan_version),
  foreign key (execution_id, project_id) references public.execution_runs(id, project_id) on delete cascade,
  foreign key (intervention_id, project_id) references public.generated_interventions(id, project_id) on delete restrict
);

alter table public.execution_runs add constraint execution_active_plan_project_fk
  foreign key (active_plan_id, project_id) references public.execution_plans(id, project_id) on delete restrict;

create table public.execution_steps (
  id uuid primary key default extensions.uuid_generate_v4(),
  execution_id uuid not null,
  plan_id uuid not null,
  project_id uuid not null,
  step_key text not null,
  sequence integer not null check (sequence > 0),
  name text not null,
  status text not null default 'PENDING' check (status in ('PENDING','RUNNING','SUCCEEDED','FAILED','CANCELLED','UNKNOWN')),
  retry_safety text not null check (retry_safety in ('SAFE_TO_RETRY','UNSAFE_TO_RETRY','UNKNOWN')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 1 check (max_attempts between 1 and 10),
  rollback_status text not null default 'NOT_SUPPORTED' check (rollback_status in ('NOT_SUPPORTED','AVAILABLE','NOT_REQUESTED','SUCCEEDED','FAILED')),
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, project_id),
  unique (plan_id, step_key),
  foreign key (execution_id, project_id) references public.execution_runs(id, project_id) on delete cascade,
  foreign key (plan_id, project_id) references public.execution_plans(id, project_id) on delete restrict
);

create table public.execution_approvals (
  id uuid primary key default extensions.uuid_generate_v4(),
  project_id uuid not null,
  execution_id uuid not null,
  plan_id uuid not null,
  requested_action text not null,
  requested_scope text not null,
  requested_at timestamptz not null default now(),
  approver_id uuid,
  approved_at timestamptz,
  expires_at timestamptz,
  status text not null check (status in ('REQUIRED_APPROVAL','APPROVED','REJECTED','EXPIRED')),
  artifact_version integer not null check (artifact_version > 0),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (id, project_id),
  foreign key (execution_id, project_id) references public.execution_runs(id, project_id) on delete cascade,
  foreign key (plan_id, project_id) references public.execution_plans(id, project_id) on delete restrict,
  foreign key (approver_id) references public.profiles(id) on delete restrict,
  check ((status = 'APPROVED' and approver_id is not null and approved_at is not null)
    or status in ('REQUIRED_APPROVAL','REJECTED','EXPIRED'))
);
create unique index idx_execution_single_approval_decision on public.execution_approvals(plan_id, status)
  where status in ('APPROVED','REJECTED');

create table public.execution_inputs (
  id uuid primary key default extensions.uuid_generate_v4(),
  execution_id uuid not null,
  plan_id uuid not null,
  project_id uuid not null,
  input_key text not null,
  input_type text not null,
  submitted_value text not null check (char_length(submitted_value) between 1 and 4000),
  value_hash text not null check (value_hash ~ '^[0-9a-f]{64}$'),
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  unique (id, project_id),
  unique (execution_id, input_key, value_hash),
  foreign key (execution_id, project_id) references public.execution_runs(id, project_id) on delete cascade,
  foreign key (plan_id, project_id) references public.execution_plans(id, project_id) on delete restrict
);

create table public.execution_artifacts (
  id uuid primary key default extensions.uuid_generate_v4(),
  execution_id uuid not null,
  plan_id uuid not null,
  step_id uuid,
  project_id uuid not null,
  artifact_type text not null check (artifact_type in ('CONTENT_DRAFT','STRUCTURED_DATA_DRAFT','PROFILE_UPDATE_DRAFT','CONTENT_BRIEF','MANUAL_PACKAGE')),
  media_type text not null check (media_type in ('application/json','text/markdown')),
  content jsonb not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  is_draft boolean not null check (is_draft),
  created_at timestamptz not null default now(),
  unique (id, project_id),
  unique (plan_id, step_id, content_hash),
  foreign key (execution_id, project_id) references public.execution_runs(id, project_id) on delete cascade,
  foreign key (plan_id, project_id) references public.execution_plans(id, project_id) on delete restrict,
  foreign key (step_id, project_id) references public.execution_steps(id, project_id) on delete restrict
);

create table public.execution_evidence (
  id uuid primary key default extensions.uuid_generate_v4(),
  execution_id uuid not null,
  plan_id uuid not null,
  step_id uuid not null,
  project_id uuid not null,
  request_id text,
  external_resource_id text,
  response_status integer,
  resulting_url text,
  artifact_hash text,
  before_snapshot_hash text,
  after_snapshot_hash text,
  adapter_version text not null,
  execution_status text not null check (execution_status in ('PENDING','RUNNING','SUCCEEDED','FAILED','CANCELLED','UNKNOWN')),
  confirmation text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (id, project_id),
  unique (step_id, request_id),
  foreign key (execution_id, project_id) references public.execution_runs(id, project_id) on delete cascade,
  foreign key (plan_id, project_id) references public.execution_plans(id, project_id) on delete restrict,
  foreign key (step_id, project_id) references public.execution_steps(id, project_id) on delete restrict
);

create table public.execution_events (
  id uuid primary key default extensions.uuid_generate_v4(),
  project_id uuid not null,
  execution_id uuid not null,
  step_id uuid,
  actor_type text not null check (actor_type in ('USER','SYSTEM','WORKER')),
  actor_id uuid,
  event_type text not null check (event_type in ('EXECUTION_CREATED','EXECUTION_READY','APPROVAL_REQUESTED','APPROVED','REJECTED','INPUT_REQUESTED','INPUT_SUBMITTED','EXECUTION_QUEUED','EXECUTION_STARTED','STEP_STARTED','STEP_SUCCEEDED','STEP_FAILED','EXECUTION_SUCCEEDED','EXECUTION_PARTIAL','EXECUTION_FAILED','EXECUTION_BLOCKED','EXECUTION_CANCELLED','MANUAL_REQUIRED','PLAN_REPLACED','APPROVAL_EXPIRED','RETRY_QUEUED')),
  payload_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, project_id),
  foreign key (execution_id, project_id) references public.execution_runs(id, project_id) on delete cascade,
  foreign key (step_id, project_id) references public.execution_steps(id, project_id) on delete restrict,
  foreign key (actor_id) references public.profiles(id) on delete restrict
);
create index idx_execution_events_run_created on public.execution_events(execution_id, created_at);

alter table public.audit_queue drop constraint if exists audit_queue_job_type_check;
alter table public.audit_queue drop constraint if exists audit_queue_job_target_check;
alter table public.audit_queue add column execution_run_id uuid references public.execution_runs(id) on delete cascade;
alter table public.audit_queue add constraint audit_queue_job_type_check check (job_type in ('AUDIT','AI_OBSERVATION','EVIDENCE_DIAGNOSIS','INTERVENTION_GENERATION','EXECUTION'));
alter table public.audit_queue add constraint audit_queue_job_target_check check (
  (job_type = 'AUDIT' and observation_run_id is null and diagnosis_run_id is null and intervention_run_id is null and execution_run_id is null)
  or (job_type = 'AI_OBSERVATION' and audit_id is null and observation_run_id is not null and diagnosis_run_id is null and intervention_run_id is null and execution_run_id is null)
  or (job_type = 'EVIDENCE_DIAGNOSIS' and audit_id is null and observation_run_id is null and diagnosis_run_id is not null and intervention_run_id is null and execution_run_id is null)
  or (job_type = 'INTERVENTION_GENERATION' and audit_id is null and observation_run_id is null and diagnosis_run_id is null and intervention_run_id is not null and execution_run_id is null)
  or (job_type = 'EXECUTION' and audit_id is null and observation_run_id is null and diagnosis_run_id is null and intervention_run_id is null and execution_run_id is not null)
);
create unique index idx_audit_queue_execution_run on public.audit_queue(execution_run_id);

create or replace function public.create_execution_run(
  p_project_id uuid, p_intervention_id uuid, p_idempotency_key text, p_execution_key text,
  p_initial_status text, p_plan jsonb, p_actor_id uuid, p_retry_of_execution_id uuid default null,
  p_attempt_number integer default 1
)
returns table (run_id uuid, outcome text)
language plpgsql security definer set search_path = '' as $$
declare
  existing_id uuid; new_run_id uuid; new_plan_id uuid; source record; initial_event text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'service_role required' using errcode = '42501'; end if;
  select r.id into existing_id from public.execution_runs r where r.project_id = p_project_id and r.idempotency_key = p_idempotency_key;
  if existing_id is not null then return query select existing_id, 'EXISTING'::text; return; end if;
  select r.id into existing_id from public.execution_runs r where r.execution_key = p_execution_key
    and r.status not in ('FAILED','CANCELLED','UNKNOWN','PARTIALLY_SUCCEEDED') order by r.created_at desc limit 1;
  if existing_id is not null then return query select existing_id, 'EXISTING'::text; return; end if;

  select i.id intervention_id, i.project_id, i.run_id intervention_run_id, i.status intervention_status,
    r.status intervention_run_status, r.diagnosis_run_id, r.observation_run_id, r.buyer_question_set_id, r.business_understanding_run_id
  into source from public.generated_interventions i join public.intervention_generation_runs r on r.id = i.run_id
  where i.id = p_intervention_id and i.project_id = p_project_id;
  if source.intervention_id is null then raise exception 'Intervention not found in project' using errcode = '23503'; end if;
  if source.intervention_run_status not in ('COMPLETED','PARTIAL_SUCCESS') or source.intervention_status not in ('READY_FOR_EXECUTION','NEEDS_INPUT') then
    raise exception 'Intervention is not finalized for execution' using errcode = '23514';
  end if;
  if p_retry_of_execution_id is not null and not exists (
    select 1 from public.execution_runs r where r.id = p_retry_of_execution_id and r.project_id = p_project_id
      and r.status in ('FAILED','UNKNOWN','PARTIALLY_SUCCEEDED')
  ) then raise exception 'Retry source is invalid' using errcode = '23514'; end if;

  insert into public.execution_runs (
    project_id, intervention_id, intervention_run_id, diagnosis_run_id, observation_run_id,
    buyer_question_set_id, business_understanding_run_id, status, idempotency_key, execution_key,
    retry_of_execution_id, attempt_number
  ) values (
    p_project_id, source.intervention_id, source.intervention_run_id, source.diagnosis_run_id, source.observation_run_id,
    source.buyer_question_set_id, source.business_understanding_run_id, 'PLANNED', p_idempotency_key, p_execution_key,
    p_retry_of_execution_id, p_attempt_number
  ) returning id into new_run_id;

  insert into public.execution_plans (
    execution_id, project_id, plan_version, intervention_id, intervention_key, diagnosis_key,
    affected_questions, intervention_type, target_surface, adapter_id, adapter_version,
    required_permissions, required_inputs, payload, payload_hash, prerequisites, approval_status,
    acceptance_criteria, risk, retry_safety, rollback, engine_version, schema_version, payload_version,
    content_generation_version, upstream_versions, created_at
  ) values (
    new_run_id, p_project_id, (p_plan->>'planVersion')::integer, source.intervention_id,
    p_plan->>'interventionId', p_plan->>'diagnosisId', p_plan->'affectedQuestions',
    p_plan->>'interventionType', p_plan->>'targetSurface', p_plan->>'adapterId', p_plan->>'adapterVersion',
    p_plan->'requiredPermissions', p_plan->'requiredInputs', p_plan->'payload', p_plan->>'payloadHash',
    p_plan->'prerequisites', p_plan->>'approvalStatus', p_plan->'acceptanceCriteria', p_plan->>'risk',
    p_plan->>'retrySafety', p_plan->'rollback', p_plan->>'engineVersion', p_plan->>'schemaVersion',
    p_plan->>'payloadVersion', nullif(p_plan->>'contentGenerationVersion',''), p_plan->'upstreamVersions',
    coalesce((p_plan->>'createdAt')::timestamptz, now())
  ) returning id into new_plan_id;
  update public.execution_runs set active_plan_id = new_plan_id, status = p_initial_status,
    completed_at = case when p_initial_status in ('BLOCKED','MANUAL_REQUIRED','CANCELLED') then now() else null end
    where id = new_run_id;

  insert into public.execution_events(project_id, execution_id, actor_type, actor_id, event_type, payload_hash, metadata)
    values (p_project_id, new_run_id, 'USER', p_actor_id, 'EXECUTION_CREATED', p_plan->>'payloadHash',
      jsonb_build_object('planId', new_plan_id, 'adapterId', p_plan->>'adapterId', 'status', p_initial_status));
  initial_event := case p_initial_status when 'QUEUED' then 'EXECUTION_QUEUED' when 'WAITING_FOR_INPUT' then 'INPUT_REQUESTED'
    when 'WAITING_FOR_APPROVAL' then 'APPROVAL_REQUESTED' when 'MANUAL_REQUIRED' then 'MANUAL_REQUIRED'
    when 'BLOCKED' then 'EXECUTION_BLOCKED' else 'EXECUTION_READY' end;
  insert into public.execution_events(project_id, execution_id, actor_type, actor_id, event_type, payload_hash, metadata)
    values (p_project_id, new_run_id, 'SYSTEM', null, initial_event, p_plan->>'payloadHash', jsonb_build_object('planId', new_plan_id));
  if p_initial_status = 'WAITING_FOR_APPROVAL' then
    insert into public.execution_approvals(project_id, execution_id, plan_id, requested_action, requested_scope, status, artifact_version, payload_hash)
      values (p_project_id, new_run_id, new_plan_id, p_plan->'payload'->>'action', p_plan->>'targetSurface', 'REQUIRED_APPROVAL', (p_plan->>'planVersion')::integer, p_plan->>'payloadHash');
  end if;
  if p_initial_status = 'MANUAL_REQUIRED' then
    insert into public.execution_artifacts(execution_id, plan_id, project_id, artifact_type, media_type, content, content_hash, is_draft)
      values (new_run_id, new_plan_id, p_project_id, 'MANUAL_PACKAGE', 'application/json', p_plan->'payload', p_plan->>'payloadHash', true);
  end if;
  return query select new_run_id, 'CREATED'::text;
exception when unique_violation then
  select r.id into existing_id from public.execution_runs r where r.project_id = p_project_id
    and (r.idempotency_key = p_idempotency_key or (r.execution_key = p_execution_key and r.status not in ('FAILED','CANCELLED','UNKNOWN','PARTIALLY_SUCCEEDED')))
    order by r.created_at desc limit 1;
  if existing_id is not null then return query select existing_id, 'EXISTING'::text; return; end if;
  raise;
end; $$;

create or replace function public.replace_execution_plan(
  p_execution_id uuid, p_previous_plan_id uuid, p_plan jsonb, p_status text, p_actor_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare run_row record; new_plan_id uuid; next_event text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'service_role required' using errcode = '42501'; end if;
  select * into run_row from public.execution_runs where id = p_execution_id for update;
  if run_row.id is null or run_row.active_plan_id <> p_previous_plan_id or run_row.status <> 'WAITING_FOR_INPUT' then raise exception 'Execution plan replacement conflict' using errcode = '40001'; end if;
  insert into public.execution_plans (
    execution_id, project_id, plan_version, intervention_id, intervention_key, diagnosis_key, affected_questions,
    intervention_type, target_surface, adapter_id, adapter_version, required_permissions, required_inputs, payload,
    payload_hash, prerequisites, approval_status, acceptance_criteria, risk, retry_safety, rollback,
    engine_version, schema_version, payload_version, content_generation_version, upstream_versions, created_at
  ) values (
    p_execution_id, run_row.project_id, (p_plan->>'planVersion')::integer, run_row.intervention_id,
    p_plan->>'interventionId', p_plan->>'diagnosisId', p_plan->'affectedQuestions', p_plan->>'interventionType',
    p_plan->>'targetSurface', p_plan->>'adapterId', p_plan->>'adapterVersion', p_plan->'requiredPermissions',
    p_plan->'requiredInputs', p_plan->'payload', p_plan->>'payloadHash', p_plan->'prerequisites',
    p_plan->>'approvalStatus', p_plan->'acceptanceCriteria', p_plan->>'risk', p_plan->>'retrySafety',
    p_plan->'rollback', p_plan->>'engineVersion', p_plan->>'schemaVersion', p_plan->>'payloadVersion',
    nullif(p_plan->>'contentGenerationVersion',''), p_plan->'upstreamVersions', coalesce((p_plan->>'createdAt')::timestamptz, now())
  ) returning id into new_plan_id;
  update public.execution_runs set active_plan_id = new_plan_id, status = p_status, error_code = null, error_message = null where id = p_execution_id;
  insert into public.execution_approvals(project_id, execution_id, plan_id, requested_action, requested_scope, status, artifact_version, payload_hash)
    select run_row.project_id, p_execution_id, new_plan_id, p_plan->'payload'->>'action', p_plan->>'targetSurface', 'REQUIRED_APPROVAL',
      (p_plan->>'planVersion')::integer, p_plan->>'payloadHash' where p_status = 'WAITING_FOR_APPROVAL';
  insert into public.execution_artifacts(execution_id, plan_id, project_id, artifact_type, media_type, content, content_hash, is_draft)
    select p_execution_id, new_plan_id, run_row.project_id, 'MANUAL_PACKAGE', 'application/json', p_plan->'payload', p_plan->>'payloadHash', true
      where p_status = 'MANUAL_REQUIRED';
  insert into public.execution_events(project_id, execution_id, actor_type, actor_id, event_type, payload_hash, metadata)
    values (run_row.project_id, p_execution_id, 'USER', p_actor_id, 'PLAN_REPLACED', p_plan->>'payloadHash',
      jsonb_build_object('previousPlanId', p_previous_plan_id, 'newPlanId', new_plan_id));
  next_event := case p_status when 'QUEUED' then 'EXECUTION_QUEUED' when 'WAITING_FOR_INPUT' then 'INPUT_REQUESTED'
    when 'WAITING_FOR_APPROVAL' then 'APPROVAL_REQUESTED' when 'MANUAL_REQUIRED' then 'MANUAL_REQUIRED'
    else 'EXECUTION_READY' end;
  insert into public.execution_events(project_id, execution_id, actor_type, actor_id, event_type, payload_hash, metadata)
    values (run_row.project_id, p_execution_id, 'SYSTEM', null, next_event, p_plan->>'payloadHash', jsonb_build_object('planId', new_plan_id));
  return p_execution_id;
end; $$;

create or replace function public.transition_execution_run(
  p_execution_id uuid, p_from text[], p_to text, p_actor_type text, p_actor_id uuid,
  p_event_type text, p_payload_hash text, p_metadata jsonb, p_error_code text default null,
  p_error_message text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare run_row record;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'service_role required' using errcode = '42501'; end if;
  select * into run_row from public.execution_runs where id = p_execution_id for update;
  if run_row.id is null then raise exception 'Execution not found' using errcode = 'P0002'; end if;
  if not (run_row.status = any(p_from)) then raise exception 'Execution state conflict' using errcode = '40001'; end if;
  if run_row.status in ('SUCCEEDED','PARTIALLY_SUCCEEDED','FAILED','BLOCKED','MANUAL_REQUIRED','CANCELLED') then raise exception 'Terminal execution is immutable' using errcode = '23514'; end if;
  if not (
    (run_row.status = 'PLANNED' and p_to in ('READY','WAITING_FOR_INPUT','WAITING_FOR_APPROVAL','BLOCKED','MANUAL_REQUIRED','CANCELLED'))
    or (run_row.status = 'READY' and p_to in ('QUEUED','WAITING_FOR_INPUT','WAITING_FOR_APPROVAL','BLOCKED','MANUAL_REQUIRED','CANCELLED'))
    or (run_row.status = 'WAITING_FOR_INPUT' and p_to in ('READY','WAITING_FOR_APPROVAL','MANUAL_REQUIRED','BLOCKED','CANCELLED'))
    or (run_row.status = 'WAITING_FOR_APPROVAL' and p_to in ('QUEUED','READY','BLOCKED','MANUAL_REQUIRED','CANCELLED'))
    or (run_row.status = 'QUEUED' and p_to in ('RUNNING','CANCELLED','BLOCKED','FAILED'))
    or (run_row.status = 'RUNNING' and p_to in ('QUEUED','SUCCEEDED','PARTIALLY_SUCCEEDED','FAILED','BLOCKED','CANCELLED','UNKNOWN'))
    or (run_row.status = 'UNKNOWN' and p_to in ('FAILED','SUCCEEDED','PARTIALLY_SUCCEEDED','BLOCKED'))
  ) then raise exception 'Invalid execution state transition' using errcode = '23514'; end if;
  update public.execution_runs set status = p_to, error_code = p_error_code, error_message = p_error_message,
    started_at = case when p_to = 'RUNNING' then coalesce(started_at, now()) else started_at end,
    completed_at = case when p_to in ('SUCCEEDED','PARTIALLY_SUCCEEDED','FAILED','BLOCKED','MANUAL_REQUIRED','CANCELLED') then now() else completed_at end,
    cancelled_at = case when p_to = 'CANCELLED' then now() else cancelled_at end
    where id = p_execution_id;
  insert into public.execution_events(project_id, execution_id, actor_type, actor_id, event_type, payload_hash, metadata)
    values (run_row.project_id, p_execution_id, p_actor_type, p_actor_id, p_event_type, p_payload_hash, coalesce(p_metadata, '{}'::jsonb));
  return p_execution_id;
end; $$;

create or replace function public.record_execution_approval(
  p_execution_id uuid, p_plan_id uuid, p_approver_id uuid, p_decision text,
  p_expires_at timestamptz, p_payload_hash text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare run_row record; plan_row record; approval_id uuid;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'service_role required' using errcode = '42501'; end if;
  select * into run_row from public.execution_runs where id = p_execution_id for update;
  select * into plan_row from public.execution_plans where id = p_plan_id and execution_id = p_execution_id;
  if run_row.id is null or plan_row.id is null or run_row.active_plan_id <> p_plan_id or run_row.status <> 'WAITING_FOR_APPROVAL' then raise exception 'Approval state conflict' using errcode = '40001'; end if;
  if plan_row.payload_hash <> p_payload_hash then raise exception 'Approval payload hash mismatch' using errcode = '23514'; end if;
  if p_decision not in ('APPROVED','REJECTED') then raise exception 'Invalid approval decision' using errcode = '23514'; end if;
  if p_decision = 'APPROVED' and p_expires_at is not null and p_expires_at <= now() then raise exception 'Approval is already expired' using errcode = '23514'; end if;
  insert into public.execution_approvals(project_id, execution_id, plan_id, requested_action, requested_scope,
    approver_id, approved_at, expires_at, status, artifact_version, payload_hash)
  values (run_row.project_id, p_execution_id, p_plan_id, plan_row.payload->>'action', plan_row.target_surface,
    p_approver_id, case when p_decision = 'APPROVED' then now() else null end, p_expires_at, p_decision,
    plan_row.plan_version, plan_row.payload_hash) returning id into approval_id;
  insert into public.execution_events(project_id, execution_id, actor_type, actor_id, event_type, payload_hash, metadata)
    values (run_row.project_id, p_execution_id, 'USER', p_approver_id, case p_decision when 'APPROVED' then 'APPROVED' else 'REJECTED' end,
      plan_row.payload_hash, jsonb_build_object('approvalId', approval_id, 'planId', p_plan_id));
  return approval_id;
end; $$;

create or replace function public.prepare_execution_step(
  p_execution_id uuid, p_plan_id uuid, p_step_key text, p_name text,
  p_sequence integer, p_retry_safety text, p_max_attempts integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare run_row record; step_id uuid;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'service_role required' using errcode = '42501'; end if;
  select * into run_row from public.execution_runs where id = p_execution_id for update;
  if run_row.id is null or run_row.active_plan_id <> p_plan_id or run_row.status <> 'RUNNING' then raise exception 'Execution step state conflict' using errcode = '40001'; end if;
  insert into public.execution_steps(execution_id, plan_id, project_id, step_key, sequence, name, status, retry_safety, attempt_count, max_attempts)
    values (p_execution_id, p_plan_id, run_row.project_id, p_step_key, p_sequence, p_name, 'RUNNING', p_retry_safety, 1, p_max_attempts)
  on conflict (plan_id, step_key) do update set
    status = case when execution_steps.status = 'SUCCEEDED' then 'SUCCEEDED' else 'RUNNING' end,
    attempt_count = case when execution_steps.status = 'SUCCEEDED' then execution_steps.attempt_count else execution_steps.attempt_count + 1 end,
    started_at = coalesce(execution_steps.started_at, now()), error_code = null, error_message = null
    where execution_steps.status = 'SUCCEEDED' or execution_steps.attempt_count < execution_steps.max_attempts
  returning id into step_id;
  if step_id is null then raise exception 'Execution step retry limit reached' using errcode = '23514'; end if;
  insert into public.execution_events(project_id, execution_id, step_id, actor_type, event_type, payload_hash, metadata)
    select run_row.project_id, p_execution_id, step_id, 'WORKER', 'STEP_STARTED', p.payload_hash,
      jsonb_build_object('stepKey', p_step_key) from public.execution_plans p where p.id = p_plan_id;
  return step_id;
end; $$;

create or replace function public.complete_execution_step(
  p_step_id uuid, p_execution_id uuid, p_status text, p_artifact jsonb,
  p_evidence jsonb, p_error_code text, p_error_message text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare run_row record; step_row record; artifact_id uuid;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'service_role required' using errcode = '42501'; end if;
  select * into run_row from public.execution_runs where id = p_execution_id for update;
  select * into step_row from public.execution_steps where id = p_step_id and execution_id = p_execution_id for update;
  if run_row.status <> 'RUNNING' or step_row.id is null or step_row.status <> 'RUNNING' then raise exception 'Execution step completion conflict' using errcode = '40001'; end if;
  update public.execution_steps set status = p_status, error_code = p_error_code, error_message = p_error_message, completed_at = now() where id = p_step_id;
  if p_artifact is not null then
    insert into public.execution_artifacts(execution_id, plan_id, step_id, project_id, artifact_type, media_type, content, content_hash, is_draft)
    values (p_execution_id, step_row.plan_id, p_step_id, run_row.project_id, p_artifact->>'artifactType', p_artifact->>'mediaType',
      p_artifact->'content', p_artifact->>'contentHash', true)
    on conflict (plan_id, step_id, content_hash) do nothing returning id into artifact_id;
  end if;
  insert into public.execution_evidence(execution_id, plan_id, step_id, project_id, request_id, external_resource_id,
    response_status, resulting_url, artifact_hash, before_snapshot_hash, after_snapshot_hash, adapter_version,
    execution_status, confirmation, occurred_at)
  values (p_execution_id, step_row.plan_id, p_step_id, run_row.project_id, p_evidence->>'requestId',
    p_evidence->>'externalResourceId', (p_evidence->>'responseStatus')::integer, p_evidence->>'resultingUrl',
    p_evidence->>'artifactHash', p_evidence->>'beforeSnapshotHash', p_evidence->>'afterSnapshotHash',
    p_evidence->>'adapterVersion', p_status, p_evidence->>'confirmation', (p_evidence->>'timestamp')::timestamptz);
  insert into public.execution_events(project_id, execution_id, step_id, actor_type, event_type, payload_hash, metadata)
    select run_row.project_id, p_execution_id, p_step_id, 'WORKER', case when p_status = 'SUCCEEDED' then 'STEP_SUCCEEDED' else 'STEP_FAILED' end,
      p.payload_hash, jsonb_build_object('artifactId', artifact_id, 'status', p_status, 'errorCode', p_error_code)
    from public.execution_plans p where p.id = step_row.plan_id;
  return p_step_id;
end; $$;

create or replace function public.guard_immutable_execution_record()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  raise exception 'Execution history is immutable';
end; $$;

create or replace function public.guard_terminal_execution_run()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  if old.status in ('SUCCEEDED','PARTIALLY_SUCCEEDED','FAILED','BLOCKED','MANUAL_REQUIRED','CANCELLED') then raise exception 'Terminal execution is immutable'; end if;
  if tg_op = 'DELETE' then raise exception 'Execution history cannot be deleted'; end if;
  return new;
end; $$;

create or replace function public.guard_execution_step_history()
returns trigger language plpgsql security definer set search_path = '' as $$
declare parent_status text; target_execution_id uuid;
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  target_execution_id := case when tg_op = 'INSERT' then new.execution_id else old.execution_id end;
  select status into parent_status from public.execution_runs where id = target_execution_id;
  if parent_status is null then raise exception 'Execution step parent is unavailable'; end if;
  if tg_op = 'INSERT' and parent_status <> 'RUNNING' then raise exception 'Execution steps can only start while the execution is running'; end if;
  if tg_op in ('UPDATE','DELETE') and parent_status <> 'RUNNING' then raise exception 'Finalized execution step history is immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

create trigger execution_run_terminal_immutable before update or delete on public.execution_runs for each row execute function public.guard_terminal_execution_run();
create trigger execution_step_history_guard before insert or update or delete on public.execution_steps for each row execute function public.guard_execution_step_history();
create trigger execution_plan_immutable before update or delete on public.execution_plans for each row execute function public.guard_immutable_execution_record();
create trigger execution_approval_immutable before update or delete on public.execution_approvals for each row execute function public.guard_immutable_execution_record();
create trigger execution_input_immutable before update or delete on public.execution_inputs for each row execute function public.guard_immutable_execution_record();
create trigger execution_artifact_immutable before update or delete on public.execution_artifacts for each row execute function public.guard_immutable_execution_record();
create trigger execution_evidence_immutable before update or delete on public.execution_evidence for each row execute function public.guard_immutable_execution_record();
create trigger execution_event_immutable before update or delete on public.execution_events for each row execute function public.guard_immutable_execution_record();

-- Extend the shared stale-job recovery contract. Safe Engine 06 draft steps
-- return to QUEUED and keep their step attempt history; unsafe or exhausted
-- operations become FAILED instead of being retried blindly.
create or replace function public.recover_stale_audit_jobs(p_stale_minutes int default 15)
returns int language plpgsql security definer set search_path = '' as $$
declare changed int;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'recover_stale_audit_jobs requires service_role' using errcode = '42501'; end if;
  if p_stale_minutes < 5 or p_stale_minutes > 1440 then raise exception 'invalid stale threshold' using errcode = '22023'; end if;

  update public.execution_runs r set
    status = case when q.attempts < q.max_attempts and p.retry_safety = 'SAFE_TO_RETRY' then 'QUEUED' else 'FAILED' end,
    error_code = case when q.attempts < q.max_attempts and p.retry_safety = 'SAFE_TO_RETRY' then null else 'STALE_WORKER_EXHAUSTED' end,
    error_message = case when q.attempts < q.max_attempts and p.retry_safety = 'SAFE_TO_RETRY' then null else 'Worker heartbeat expired and safe retries are unavailable or exhausted.' end,
    completed_at = case when q.attempts < q.max_attempts and p.retry_safety = 'SAFE_TO_RETRY' then null else now() end
  from public.audit_queue q, public.execution_plans p
  where p.id = r.active_plan_id and q.execution_run_id = r.id and q.job_type = 'EXECUTION' and q.status = 'processing'
    and r.status = 'RUNNING'
    and coalesce(q.last_heartbeat_at, q.started_at, q.created_at) < now() - make_interval(mins => p_stale_minutes);

  insert into public.execution_events(project_id, execution_id, actor_type, event_type, payload_hash, metadata)
  select r.project_id, r.id, 'SYSTEM',
    case when r.status = 'QUEUED' then 'RETRY_QUEUED' else 'EXECUTION_FAILED' end,
    p.payload_hash, jsonb_build_object('reason', 'STALE_WORKER', 'queueAttempts', q.attempts)
  from public.audit_queue q
  join public.execution_runs r on r.id = q.execution_run_id
  join public.execution_plans p on p.id = r.active_plan_id
  where q.job_type = 'EXECUTION' and q.status = 'processing' and r.status in ('QUEUED','FAILED')
    and coalesce(q.last_heartbeat_at, q.started_at, q.created_at) < now() - make_interval(mins => p_stale_minutes);

  update public.audit_queue q set
    status = case
      when q.job_type = 'EXECUTION' and exists (select 1 from public.execution_runs r where r.id = q.execution_run_id and r.status = 'FAILED') then 'failed'
      when q.attempts < q.max_attempts then 'pending' else 'failed' end,
    available_at = case when q.attempts < q.max_attempts then now() + make_interval(secs => least(900, 30 * (2 ^ greatest(q.attempts - 1, 0)))) else q.available_at end,
    started_at = case when q.attempts < q.max_attempts then null else q.started_at end,
    completed_at = case
      when q.job_type = 'EXECUTION' and exists (select 1 from public.execution_runs r where r.id = q.execution_run_id and r.status = 'FAILED') then now()
      when q.attempts < q.max_attempts then null else now() end,
    error = 'Worker heartbeat expired; job recovered automatically'
  where q.status = 'processing'
    and coalesce(q.last_heartbeat_at, q.started_at, q.created_at) < now() - make_interval(mins => p_stale_minutes);
  get diagnostics changed = row_count;
  return changed;
end; $$;

alter table public.execution_runs enable row level security;
alter table public.execution_plans enable row level security;
alter table public.execution_steps enable row level security;
alter table public.execution_approvals enable row level security;
alter table public.execution_inputs enable row level security;
alter table public.execution_artifacts enable row level security;
alter table public.execution_evidence enable row level security;
alter table public.execution_events enable row level security;

create policy "Clerk owner can read execution runs" on public.execution_runs for select to authenticated using (exists (select 1 from public.projects p where p.id = execution_runs.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read execution plans" on public.execution_plans for select to authenticated using (exists (select 1 from public.projects p where p.id = execution_plans.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read execution steps" on public.execution_steps for select to authenticated using (exists (select 1 from public.projects p where p.id = execution_steps.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read execution approvals" on public.execution_approvals for select to authenticated using (exists (select 1 from public.projects p where p.id = execution_approvals.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read execution inputs" on public.execution_inputs for select to authenticated using (exists (select 1 from public.projects p where p.id = execution_inputs.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read execution artifacts" on public.execution_artifacts for select to authenticated using (exists (select 1 from public.projects p where p.id = execution_artifacts.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read execution evidence" on public.execution_evidence for select to authenticated using (exists (select 1 from public.projects p where p.id = execution_evidence.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read execution events" on public.execution_events for select to authenticated using (exists (select 1 from public.projects p where p.id = execution_events.project_id and p.user_id = public.current_clerk_profile_id()));

revoke insert, update, delete on public.execution_runs, public.execution_plans, public.execution_steps,
  public.execution_approvals, public.execution_inputs, public.execution_artifacts, public.execution_evidence,
  public.execution_events from anon, authenticated;
revoke all on function public.create_execution_run(uuid,uuid,text,text,text,jsonb,uuid,uuid,integer) from public, anon, authenticated;
revoke all on function public.replace_execution_plan(uuid,uuid,jsonb,text,uuid) from public, anon, authenticated;
revoke all on function public.transition_execution_run(uuid,text[],text,text,uuid,text,text,jsonb,text,text) from public, anon, authenticated;
revoke all on function public.record_execution_approval(uuid,uuid,uuid,text,timestamptz,text) from public, anon, authenticated;
revoke all on function public.prepare_execution_step(uuid,uuid,text,text,integer,text,integer) from public, anon, authenticated;
revoke all on function public.complete_execution_step(uuid,uuid,text,jsonb,jsonb,text,text) from public, anon, authenticated;
revoke execute on function public.guard_immutable_execution_record() from public, anon, authenticated;
revoke execute on function public.guard_terminal_execution_run() from public, anon, authenticated;
revoke execute on function public.guard_execution_step_history() from public, anon, authenticated;
grant execute on function public.create_execution_run(uuid,uuid,text,text,text,jsonb,uuid,uuid,integer) to service_role;
grant execute on function public.replace_execution_plan(uuid,uuid,jsonb,text,uuid) to service_role;
grant execute on function public.transition_execution_run(uuid,text[],text,text,uuid,text,text,jsonb,text,text) to service_role;
grant execute on function public.record_execution_approval(uuid,uuid,uuid,text,timestamptz,text) to service_role;
grant execute on function public.prepare_execution_step(uuid,uuid,text,text,integer,text,integer) to service_role;
grant execute on function public.complete_execution_step(uuid,uuid,text,jsonb,jsonb,text,text) to service_role;
revoke all on function public.recover_stale_audit_jobs(int) from public, anon, authenticated;
grant execute on function public.recover_stale_audit_jobs(int) to service_role;
