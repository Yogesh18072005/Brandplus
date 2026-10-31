-- Engine 03: immutable, provider-neutral AI answer observations.
-- Additive only. The legacy audit/report pipeline remains unchanged.

alter table public.buyer_questions
  add constraint buyer_questions_id_project_unique unique (id, project_id);

create table public.ai_observation_runs (
  id uuid primary key default extensions.uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  buyer_question_set_id uuid not null,
  business_understanding_run_id uuid,
  provider text not null,
  model text not null,
  model_version text,
  provider_adapter_version text not null,
  engine_version text not null,
  prompt_version text not null,
  parser_version text not null,
  schema_version text not null,
  generation_parameters jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING','RUNNING','PARTIAL_SUCCESS','COMPLETED','FAILED')),
  requested_question_count integer not null check (requested_question_count between 1 and 30),
  completed_question_count integer not null default 0 check (completed_question_count >= 0),
  failed_question_count integer not null default 0 check (failed_question_count >= 0),
  input_tokens bigint,
  output_tokens bigint,
  total_tokens bigint,
  cost_usd numeric(14,8),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 128),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, project_id),
  unique (project_id, idempotency_key),
  foreign key (buyer_question_set_id, project_id)
    references public.buyer_question_sets(id, project_id) on delete restrict,
  foreign key (business_understanding_run_id, project_id)
    references public.business_understanding_runs(id, project_id) on delete restrict,
  check (completed_question_count + failed_question_count <= requested_question_count)
);

create table public.ai_question_observations (
  id uuid primary key default extensions.uuid_generate_v4(),
  run_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  buyer_question_id uuid not null,
  buyer_question_key text not null,
  exact_question text not null,
  question_rank integer not null,
  status text not null default 'PENDING' check (status in ('PENDING','RUNNING','COMPLETED','FAILED')),
  provider text not null,
  model text not null,
  model_version text,
  provider_response_id text,
  response_timestamp timestamptz,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  input_tokens bigint,
  output_tokens bigint,
  total_tokens bigint,
  cost_usd numeric(14,8),
  response_completeness text not null default 'INCONCLUSIVE' check (response_completeness in ('COMPLETE','PARTIAL','EMPTY','FAILED','INCONCLUSIVE')),
  parsing_status text not null default 'NOT_STARTED' check (parsing_status in ('NOT_STARTED','SUCCESS','PARTIAL','FAILED','INCONCLUSIVE')),
  extraction_status text not null default 'NOT_STARTED' check (extraction_status in ('NOT_STARTED','SUCCESS','PARTIAL','FAILED','INCONCLUSIVE')),
  target_entity_status text not null default 'INCONCLUSIVE' check (target_entity_status in ('MENTIONED','NOT_MENTIONED','INCONCLUSIVE')),
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, project_id),
  unique (run_id, buyer_question_id),
  unique (run_id, buyer_question_key),
  foreign key (run_id, project_id) references public.ai_observation_runs(id, project_id) on delete cascade,
  foreign key (buyer_question_id, project_id) references public.buyer_questions(id, project_id) on delete restrict
);

create table public.ai_raw_responses (
  id uuid primary key default extensions.uuid_generate_v4(),
  question_observation_id uuid not null unique,
  project_id uuid not null references public.projects(id) on delete cascade,
  raw_text text not null,
  provider_response_id text,
  finish_reason text,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (question_observation_id, project_id)
    references public.ai_question_observations(id, project_id) on delete cascade
);

create table public.ai_observed_entities (
  id uuid primary key default extensions.uuid_generate_v4(),
  question_observation_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  entity_key text not null,
  surface_form text not null,
  normalized_name text not null,
  entity_type text not null check (entity_type in ('COMPANY','ORGANIZATION','BRAND','PRODUCT','OTHER')),
  match_status text not null check (match_status in ('MATCHED','UNMATCHED','AMBIGUOUS')),
  target_match boolean not null default false,
  mention_count integer not null check (mention_count > 0),
  first_character_position integer not null check (first_character_position >= 0),
  first_paragraph_position integer not null check (first_paragraph_position > 0),
  recommendation_position integer check (recommendation_position is null or recommendation_position > 0),
  recommendation_strength text not null check (recommendation_strength in ('NONE','MENTION','SUGGESTED','RECOMMENDED','STRONGLY_RECOMMENDED','UNKNOWN')),
  created_at timestamptz not null default now(),
  unique (id, question_observation_id),
  unique (question_observation_id, entity_key),
  foreign key (question_observation_id, project_id)
    references public.ai_question_observations(id, project_id) on delete cascade
);

create table public.ai_entity_mentions (
  id uuid primary key default extensions.uuid_generate_v4(),
  observed_entity_id uuid not null,
  question_observation_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  surface_form text not null,
  character_position integer not null check (character_position >= 0),
  paragraph_position integer not null check (paragraph_position > 0),
  context text not null,
  created_at timestamptz not null default now(),
  unique (observed_entity_id, character_position),
  foreign key (observed_entity_id, question_observation_id)
    references public.ai_observed_entities(id, question_observation_id) on delete cascade,
  foreign key (question_observation_id, project_id)
    references public.ai_question_observations(id, project_id) on delete cascade
);

create table public.ai_observed_sources (
  id uuid primary key default extensions.uuid_generate_v4(),
  question_observation_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_key text not null,
  full_url text,
  normalized_url text,
  domain text,
  title text,
  target_domain_match boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, question_observation_id),
  unique (question_observation_id, source_key),
  foreign key (question_observation_id, project_id)
    references public.ai_question_observations(id, project_id) on delete cascade,
  check (full_url is not null or domain is not null)
);

create table public.ai_citation_observations (
  id uuid primary key default extensions.uuid_generate_v4(),
  question_observation_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_id uuid,
  citation_key text not null,
  displayed_text text,
  observed_url text,
  observed_domain text,
  source_title text,
  provider_citation_id text,
  citation_context text,
  character_position integer,
  claim_association text not null check (claim_association in ('STRUCTURAL','UNASSOCIATED','INCONCLUSIVE')),
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (question_observation_id, citation_key),
  foreign key (question_observation_id, project_id)
    references public.ai_question_observations(id, project_id) on delete cascade,
  foreign key (source_id, question_observation_id)
    references public.ai_observed_sources(id, question_observation_id) on delete restrict
);

create index idx_ai_observation_runs_project_created on public.ai_observation_runs(project_id, created_at desc);
create index idx_ai_observation_runs_status on public.ai_observation_runs(status, created_at);
create index idx_ai_question_observations_run_rank on public.ai_question_observations(run_id, question_rank);
create index idx_ai_question_observations_project_status on public.ai_question_observations(project_id, status);
create index idx_ai_observed_entities_question on public.ai_observed_entities(question_observation_id, first_character_position);
create index idx_ai_entity_mentions_question on public.ai_entity_mentions(question_observation_id, character_position);
create index idx_ai_citations_question on public.ai_citation_observations(question_observation_id, character_position);
create index idx_ai_sources_domain on public.ai_observed_sources(domain);

alter table public.audit_queue add column job_type text not null default 'AUDIT'
  check (job_type in ('AUDIT','AI_OBSERVATION'));
alter table public.audit_queue add column observation_run_id uuid references public.ai_observation_runs(id) on delete cascade;
alter table public.audit_queue add constraint audit_queue_job_target_check check (
  (job_type = 'AUDIT' and observation_run_id is null)
  or (job_type = 'AI_OBSERVATION' and audit_id is null and observation_run_id is not null)
);
create unique index idx_audit_queue_observation_run on public.audit_queue(observation_run_id) where observation_run_id is not null;

create or replace function public.create_ai_observation_run(
  p_project_id uuid,
  p_buyer_question_set_id uuid,
  p_business_understanding_run_id uuid,
  p_provider text,
  p_model text,
  p_provider_adapter_version text,
  p_engine_version text,
  p_prompt_version text,
  p_parser_version text,
  p_schema_version text,
  p_generation_parameters jsonb,
  p_idempotency_key text
)
returns table (run_id uuid, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_id uuid;
  new_run_id uuid;
  question_total integer;
  set_business_understanding_run_id uuid;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'create_ai_observation_run requires service_role' using errcode = '42501';
  end if;
  select r.id into existing_id from public.ai_observation_runs r
    where r.project_id = p_project_id and r.idempotency_key = p_idempotency_key;
  if existing_id is not null then return query select existing_id, false; return; end if;

  select s.question_count, s.business_understanding_run_id into question_total, set_business_understanding_run_id from public.buyer_question_sets s
    where s.id = p_buyer_question_set_id and s.project_id = p_project_id and s.is_frozen;
  if question_total is null or question_total < 1 then
    raise exception 'A non-empty frozen Buyer Question Set in this project is required' using errcode = '23514';
  end if;
  if p_business_understanding_run_id is not null and not exists (
    select 1 from public.business_understanding_runs b
    where b.id = p_business_understanding_run_id and b.project_id = p_project_id
  ) then raise exception 'Business Understanding run does not belong to this project' using errcode = '23503'; end if;
  if p_business_understanding_run_id is distinct from set_business_understanding_run_id then
    raise exception 'Business Understanding run does not match the Buyer Question Set' using errcode = '23514';
  end if;

  insert into public.ai_observation_runs (
    project_id, buyer_question_set_id, business_understanding_run_id, provider, model,
    provider_adapter_version, engine_version, prompt_version, parser_version, schema_version,
    generation_parameters, requested_question_count, idempotency_key
  ) values (
    p_project_id, p_buyer_question_set_id, p_business_understanding_run_id, p_provider, p_model,
    p_provider_adapter_version, p_engine_version, p_prompt_version, p_parser_version, p_schema_version,
    coalesce(p_generation_parameters, '{}'::jsonb), question_total, p_idempotency_key
  ) returning id into new_run_id;

  insert into public.ai_question_observations (
    run_id, project_id, buyer_question_id, buyer_question_key, exact_question, question_rank, provider, model
  ) select new_run_id, q.project_id, q.id, q.question_key, q.question, q.rank, p_provider, p_model
    from public.buyer_questions q where q.question_set_id = p_buyer_question_set_id order by q.rank;

  insert into public.audit_queue (project_id, audit_id, observation_run_id, job_type, priority, status)
    values (p_project_id, null, new_run_id, 'AI_OBSERVATION', 0, 'pending');
  return query select new_run_id, true;
exception when unique_violation then
  select r.id into existing_id from public.ai_observation_runs r
    where r.project_id = p_project_id and r.idempotency_key = p_idempotency_key;
  if existing_id is not null then return query select existing_id, false; return; end if;
  raise;
end;
$$;

create or replace function public.prepare_ai_question_observation(p_run_id uuid, p_buyer_question_key text)
returns void language plpgsql security definer set search_path = '' as $$
declare observation_id uuid; current_status text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'service_role required' using errcode = '42501'; end if;
  select q.id, q.status into observation_id, current_status from public.ai_question_observations q
    where q.run_id = p_run_id and q.buyer_question_key = p_buyer_question_key for update;
  if observation_id is null then raise exception 'Question observation not found' using errcode = 'P0002'; end if;
  if current_status = 'COMPLETED' then return; end if;
  delete from public.ai_citation_observations c where c.question_observation_id = observation_id;
  delete from public.ai_entity_mentions m where m.question_observation_id = observation_id;
  delete from public.ai_observed_entities e where e.question_observation_id = observation_id;
  delete from public.ai_observed_sources s where s.question_observation_id = observation_id;
  delete from public.ai_raw_responses r where r.question_observation_id = observation_id;
  update public.ai_question_observations set status = 'RUNNING', started_at = now(), completed_at = null,
    error_code = null, error_message = null, response_completeness = 'INCONCLUSIVE', parsing_status = 'NOT_STARTED',
    extraction_status = 'NOT_STARTED', target_entity_status = 'INCONCLUSIVE'
    where id = observation_id;
end;
$$;

create or replace function public.complete_ai_observation_run(p_run_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare completed_count integer; failed_count integer; pending_count integer; degraded_count integer; final_status text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'service_role required' using errcode = '42501'; end if;
  select count(*) filter (where status = 'COMPLETED'), count(*) filter (where status = 'FAILED'),
    count(*) filter (where status in ('PENDING','RUNNING')),
    count(*) filter (where status = 'COMPLETED' and (response_completeness <> 'COMPLETE' or extraction_status <> 'SUCCESS'))
    into completed_count, failed_count, pending_count, degraded_count
    from public.ai_question_observations where run_id = p_run_id;
  if pending_count > 0 then raise exception 'Observation run still has unfinished questions' using errcode = '23514'; end if;
  final_status := case
    when failed_count = 0 and degraded_count = 0 then 'COMPLETED'
    when completed_count > 0 then 'PARTIAL_SUCCESS'
    else 'FAILED'
  end;
  update public.ai_observation_runs r set status = final_status, completed_question_count = completed_count,
    failed_question_count = failed_count, completed_at = now(),
    input_tokens = x.input_tokens, output_tokens = x.output_tokens, total_tokens = x.total_tokens,
    cost_usd = x.cost_usd, model_version = x.model_version
  from (select
      case when count(*) = count(input_tokens) then sum(input_tokens) end input_tokens,
      case when count(*) = count(output_tokens) then sum(output_tokens) end output_tokens,
      case when count(*) = count(total_tokens) then sum(total_tokens) end total_tokens,
      case when count(*) = count(cost_usd) then sum(cost_usd) end cost_usd,
      case when count(distinct model_version) = 1 then min(model_version) end model_version
    from public.ai_question_observations where run_id = p_run_id) x
  where r.id = p_run_id and r.status in ('PENDING','RUNNING');
  return p_run_id;
end;
$$;

create or replace function public.guard_completed_ai_observation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  if old.status in ('COMPLETED','PARTIAL_SUCCESS','FAILED') then raise exception 'Completed observation runs are immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.guard_completed_ai_question()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  if old.status = 'COMPLETED' then raise exception 'Completed question observations are immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.guard_ai_observation_child()
returns trigger language plpgsql security definer set search_path = '' as $$
declare observation_id uuid;
begin
  observation_id := case when tg_op = 'INSERT' then new.question_observation_id else old.question_observation_id end;
  if exists (select 1 from public.ai_question_observations q where q.id = observation_id and q.status = 'COMPLETED') then
    raise exception 'Completed question observation data is immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger ai_observation_run_immutable before update or delete on public.ai_observation_runs
  for each row execute function public.guard_completed_ai_observation();
create trigger ai_question_observation_immutable before update or delete on public.ai_question_observations
  for each row execute function public.guard_completed_ai_question();
create trigger ai_raw_response_immutable before update or delete on public.ai_raw_responses
  for each row execute function public.guard_ai_observation_child();
create trigger ai_entity_immutable before update or delete on public.ai_observed_entities
  for each row execute function public.guard_ai_observation_child();
create trigger ai_mention_immutable before update or delete on public.ai_entity_mentions
  for each row execute function public.guard_ai_observation_child();
create trigger ai_source_immutable before update or delete on public.ai_observed_sources
  for each row execute function public.guard_ai_observation_child();
create trigger ai_citation_immutable before update or delete on public.ai_citation_observations
  for each row execute function public.guard_ai_observation_child();

alter table public.ai_observation_runs enable row level security;
alter table public.ai_question_observations enable row level security;
alter table public.ai_raw_responses enable row level security;
alter table public.ai_observed_entities enable row level security;
alter table public.ai_entity_mentions enable row level security;
alter table public.ai_observed_sources enable row level security;
alter table public.ai_citation_observations enable row level security;

create policy "Clerk owner can read AI observation runs" on public.ai_observation_runs for select to authenticated using (
  exists (select 1 from public.projects p where p.id = ai_observation_runs.project_id and p.user_id = public.current_clerk_profile_id())
);
create policy "Clerk owner can read AI question observations" on public.ai_question_observations for select to authenticated using (
  exists (select 1 from public.projects p where p.id = ai_question_observations.project_id and p.user_id = public.current_clerk_profile_id())
);
create policy "Clerk owner can read AI raw responses" on public.ai_raw_responses for select to authenticated using (
  exists (select 1 from public.projects p where p.id = ai_raw_responses.project_id and p.user_id = public.current_clerk_profile_id())
);
create policy "Clerk owner can read AI observed entities" on public.ai_observed_entities for select to authenticated using (
  exists (select 1 from public.projects p where p.id = ai_observed_entities.project_id and p.user_id = public.current_clerk_profile_id())
);
create policy "Clerk owner can read AI entity mentions" on public.ai_entity_mentions for select to authenticated using (
  exists (select 1 from public.projects p where p.id = ai_entity_mentions.project_id and p.user_id = public.current_clerk_profile_id())
);
create policy "Clerk owner can read AI observed sources" on public.ai_observed_sources for select to authenticated using (
  exists (select 1 from public.projects p where p.id = ai_observed_sources.project_id and p.user_id = public.current_clerk_profile_id())
);
create policy "Clerk owner can read AI citations" on public.ai_citation_observations for select to authenticated using (
  exists (select 1 from public.projects p where p.id = ai_citation_observations.project_id and p.user_id = public.current_clerk_profile_id())
);

revoke insert, update, delete on public.ai_observation_runs, public.ai_question_observations, public.ai_raw_responses,
  public.ai_observed_entities, public.ai_entity_mentions, public.ai_observed_sources, public.ai_citation_observations from anon, authenticated;
revoke all on function public.create_ai_observation_run(uuid,uuid,uuid,text,text,text,text,text,text,text,jsonb,text) from public, anon, authenticated;
revoke all on function public.prepare_ai_question_observation(uuid,text) from public, anon, authenticated;
revoke all on function public.complete_ai_observation_run(uuid) from public, anon, authenticated;
revoke execute on function public.guard_completed_ai_observation() from public, anon, authenticated;
revoke execute on function public.guard_completed_ai_question() from public, anon, authenticated;
revoke execute on function public.guard_ai_observation_child() from public, anon, authenticated;
grant execute on function public.create_ai_observation_run(uuid,uuid,uuid,text,text,text,text,text,text,text,jsonb,text) to service_role;
grant execute on function public.prepare_ai_question_observation(uuid,text) to service_role;
grant execute on function public.complete_ai_observation_run(uuid) to service_role;
