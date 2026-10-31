-- Engine 05: evidence-backed intervention generation.
-- Additive only. This migration persists plans; it does not execute them.

alter table public.business_evidence add constraint business_evidence_id_project_unique unique (id, project_id);
alter table public.evidence_gaps add constraint evidence_gaps_id_project_unique unique (id, project_id);

create table public.intervention_generation_runs (
  id uuid primary key default extensions.uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  diagnosis_run_id uuid not null,
  business_understanding_run_id uuid not null,
  buyer_question_set_id uuid not null,
  observation_run_id uuid not null,
  status text not null default 'PENDING' check (status in ('PENDING','RUNNING','PARTIAL_SUCCESS','COMPLETED','FAILED','INCONCLUSIVE')),
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  result_hash text check (result_hash is null or result_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 128),
  engine_version text not null,
  schema_version text not null,
  prompt_version text not null,
  generation_version text not null,
  priority_version text not null,
  model text not null,
  model_version text,
  generation_parameters jsonb not null default '{}'::jsonb,
  business_understanding_version text not null,
  business_understanding_hash text not null,
  buyer_question_set_version text not null,
  buyer_question_set_hash text not null check (buyer_question_set_hash ~ '^[0-9a-f]{64}$'),
  observation_version text not null,
  observation_hash text not null check (observation_hash ~ '^[0-9a-f]{64}$'),
  diagnosis_version text not null,
  diagnosis_hash text not null check (diagnosis_hash ~ '^[0-9a-f]{64}$'),
  eligible_gap_count integer not null default 0 check (eligible_gap_count >= 0),
  intervention_count integer not null default 0 check (intervention_count >= 0),
  rejected_candidate_count integer not null default 0 check (rejected_candidate_count >= 0),
  llm_call_count integer not null default 0 check (llm_call_count between 0 and 3),
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  cost_usd numeric(14,8) not null default 0 check (cost_usd >= 0),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, project_id),
  unique (project_id, idempotency_key),
  foreign key (diagnosis_run_id, project_id) references public.evidence_diagnosis_runs(id, project_id) on delete restrict,
  foreign key (business_understanding_run_id, project_id) references public.business_understanding_runs(id, project_id) on delete restrict,
  foreign key (buyer_question_set_id, project_id) references public.buyer_question_sets(id, project_id) on delete restrict,
  foreign key (observation_run_id, project_id) references public.ai_observation_runs(id, project_id) on delete restrict
);

create unique index idx_intervention_run_reusable on public.intervention_generation_runs(
  project_id, input_hash, engine_version, generation_version, priority_version
) where status <> 'FAILED';
create index idx_intervention_run_project_created on public.intervention_generation_runs(project_id, created_at desc);
create index idx_intervention_run_status on public.intervention_generation_runs(status, created_at);

create table public.generated_interventions (
  id uuid primary key default extensions.uuid_generate_v4(),
  run_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  intervention_key text not null,
  primary_diagnosis_key text not null,
  primary_question_key text not null,
  exact_buyer_question text not null,
  intervention_type text not null check (intervention_type in ('ENTITY_CLARIFICATION','PRODUCT_EVIDENCE','SERVICE_EVIDENCE','INDUSTRY_EVIDENCE','USE_CASE_EVIDENCE','BUYER_EVIDENCE','TECHNICAL_EVIDENCE','COMPLIANCE_EVIDENCE','CERTIFICATION_EVIDENCE','GEOGRAPHIC_EVIDENCE','PROOF_EVIDENCE','CASE_STUDY','CUSTOMER_PROOF','SOURCE_COVERAGE','THIRD_PARTY_EVIDENCE','CONTENT_BRIEF','INFORMATION_ARCHITECTURE','STRUCTURED_DATA','PROFILE_COMPLETENESS','DOCUMENTATION','OTHER')),
  category text not null check (category in ('CLARIFY','CONSOLIDATE','ADD_PROOF','ADD_INFORMATION','IMPROVE_SOURCE','STRUCTURE','REMOVE_AMBIGUITY')),
  title text not null,
  objective text not null,
  problem_statement text not null,
  diagnosed_gap text not null,
  why_addresses_gap text not null,
  expected_deliverable text not null,
  implementation_surface text not null check (implementation_surface in ('WEBSITE_PAGE','WEBSITE_SECTION','PRODUCT_PAGE','SERVICE_PAGE','INDUSTRY_PAGE','USE_CASE_PAGE','CASE_STUDY','TECHNICAL_DOCUMENT','CERTIFICATION_PAGE','ABOUT_PAGE','CONTACT_PAGE','THIRD_PARTY_PROFILE','DIRECTORY_PROFILE','BUSINESS_PROFILE','STRUCTURED_DATA','CONTENT_LIBRARY','OTHER')),
  proposed_surface boolean not null check (proposed_surface),
  priority text not null check (priority in ('CRITICAL','HIGH','MEDIUM','LOW','UNKNOWN')),
  priority_score integer not null check (priority_score between 0 and 100),
  priority_factors jsonb not null,
  impact text not null check (impact in ('HIGH','MEDIUM','LOW','UNKNOWN')),
  effort text not null check (effort in ('HIGH','MEDIUM','LOW','UNKNOWN')),
  confidence text not null check (confidence in ('HIGH','MEDIUM','LOW','UNKNOWN')),
  status text not null check (status in ('PROPOSED','NEEDS_INPUT','BLOCKED','READY_FOR_EXECUTION','SUPERSEDED','REJECTED')),
  created_at timestamptz not null default now(),
  unique (id, project_id),
  unique (run_id, intervention_key),
  foreign key (run_id, project_id) references public.intervention_generation_runs(id, project_id) on delete cascade
);

create index idx_generated_interventions_run_priority on public.generated_interventions(run_id, priority_score desc);

create table public.intervention_question_links (
  intervention_id uuid not null,
  project_id uuid not null,
  buyer_question_id uuid not null,
  buyer_question_key text not null,
  exact_question text not null,
  primary key (intervention_id, buyer_question_id),
  foreign key (intervention_id, project_id) references public.generated_interventions(id, project_id) on delete cascade,
  foreign key (buyer_question_id, project_id) references public.buyer_questions(id, project_id) on delete restrict
);

create table public.intervention_diagnosis_links (
  intervention_id uuid not null,
  project_id uuid not null,
  question_diagnosis_id uuid not null,
  evidence_gap_id uuid not null,
  diagnosis_key text not null,
  gap_key text not null,
  primary key (intervention_id, question_diagnosis_id, evidence_gap_id),
  foreign key (intervention_id, project_id) references public.generated_interventions(id, project_id) on delete cascade,
  foreign key (question_diagnosis_id, project_id) references public.evidence_question_diagnoses(id, project_id) on delete restrict,
  foreign key (evidence_gap_id, project_id) references public.evidence_gaps(id, project_id) on delete restrict
);

create table public.intervention_evidence_links (
  id uuid primary key default extensions.uuid_generate_v4(),
  intervention_id uuid not null,
  project_id uuid not null,
  link_key text not null,
  link_kind text not null check (link_kind in ('EVIDENCE_TO_REUSE','EVIDENCE_TO_ADD')),
  business_evidence_id uuid,
  source_evidence_key text,
  evidence_type text not null,
  description text not null,
  unique (intervention_id, link_key),
  foreign key (intervention_id, project_id) references public.generated_interventions(id, project_id) on delete cascade,
  foreign key (business_evidence_id, project_id) references public.business_evidence(id, project_id) on delete restrict,
  check ((link_kind = 'EVIDENCE_TO_REUSE' and business_evidence_id is not null and source_evidence_key is not null)
    or (link_kind = 'EVIDENCE_TO_ADD' and business_evidence_id is null and source_evidence_key is null))
);

create table public.intervention_inputs (
  id uuid primary key default extensions.uuid_generate_v4(),
  intervention_id uuid not null,
  project_id uuid not null,
  input_key text not null,
  input_type text not null check (input_type in ('BUSINESS_FACT','CERTIFICATION_DETAIL','CUSTOMER_PROOF','GEOGRAPHY_DETAIL','CAPABILITY_DETAIL','TECHNICAL_SPECIFICATION','COMPLIANCE_DETAIL','CASE_STUDY_DETAIL','OTHER')),
  description text not null,
  status text not null check (status in ('AVAILABLE','INPUT_REQUIRED','UNKNOWN')),
  unique (intervention_id, input_key),
  foreign key (intervention_id, project_id) references public.generated_interventions(id, project_id) on delete cascade
);

create table public.intervention_acceptance_criteria (
  id uuid primary key default extensions.uuid_generate_v4(),
  intervention_id uuid not null,
  project_id uuid not null,
  criterion_key text not null,
  criterion text not null,
  sort_order integer not null check (sort_order >= 0),
  unique (intervention_id, criterion_key),
  foreign key (intervention_id, project_id) references public.generated_interventions(id, project_id) on delete cascade
);

create table public.intervention_dependencies (
  intervention_id uuid not null,
  project_id uuid not null,
  depends_on_intervention_id uuid not null,
  primary key (intervention_id, depends_on_intervention_id),
  foreign key (intervention_id, project_id) references public.generated_interventions(id, project_id) on delete cascade,
  foreign key (depends_on_intervention_id, project_id) references public.generated_interventions(id, project_id) on delete restrict,
  check (intervention_id <> depends_on_intervention_id)
);

create table public.intervention_measurements (
  id uuid primary key default extensions.uuid_generate_v4(),
  intervention_id uuid not null,
  project_id uuid not null,
  measurement_key text not null,
  measurement_type text not null check (measurement_type in ('TARGET_MENTION_STATUS','RECOMMENDATION_STRENGTH','CITATION_SOURCE_COVERAGE','EVIDENCE_DIMENSION','OBSERVED_ENTITY_RELATIONSHIP','QUESTION_REOBSERVATION')),
  affected_question_keys jsonb not null,
  evidence_dimensions jsonb not null,
  description text not null,
  unique (intervention_id, measurement_key),
  foreign key (intervention_id, project_id) references public.generated_interventions(id, project_id) on delete cascade
);

create table public.intervention_provenance (
  id uuid primary key default extensions.uuid_generate_v4(),
  intervention_id uuid not null,
  project_id uuid not null,
  provenance_kind text not null,
  source_key text not null,
  source_url text,
  source_title text,
  source_type text,
  snippet text,
  source_timestamp timestamptz,
  unique (intervention_id, provenance_kind, source_key),
  foreign key (intervention_id, project_id) references public.generated_interventions(id, project_id) on delete cascade
);

create table public.intervention_content_briefs (
  intervention_id uuid primary key,
  project_id uuid not null,
  target_buyer_questions jsonb not null,
  discovery_intent text not null,
  objective text not null,
  verified_fact_evidence_keys jsonb not null,
  required_sections jsonb not null,
  required_facts_to_clarify jsonb not null,
  prohibited_unsupported_claims jsonb not null,
  internal_evidence_references jsonb not null,
  acceptance_criteria jsonb not null,
  foreign key (intervention_id, project_id) references public.generated_interventions(id, project_id) on delete cascade
);

create table public.intervention_structured_data (
  intervention_id uuid primary key,
  project_id uuid not null,
  schema_type text not null check (schema_type in ('Organization','Product','Service','LocalBusiness')),
  represented_entity text not null,
  supported_properties jsonb not null,
  input_required_properties jsonb not null,
  proposed_surfaces jsonb not null,
  acceptance_criteria jsonb not null,
  foreign key (intervention_id, project_id) references public.generated_interventions(id, project_id) on delete cascade
);

alter table public.audit_queue drop constraint if exists audit_queue_job_type_check;
alter table public.audit_queue drop constraint if exists audit_queue_job_target_check;
alter table public.audit_queue add column intervention_run_id uuid references public.intervention_generation_runs(id) on delete cascade;
alter table public.audit_queue add constraint audit_queue_job_type_check check (job_type in ('AUDIT','AI_OBSERVATION','EVIDENCE_DIAGNOSIS','INTERVENTION_GENERATION'));
alter table public.audit_queue add constraint audit_queue_job_target_check check (
  (job_type = 'AUDIT' and observation_run_id is null and diagnosis_run_id is null and intervention_run_id is null)
  or (job_type = 'AI_OBSERVATION' and audit_id is null and observation_run_id is not null and diagnosis_run_id is null and intervention_run_id is null)
  or (job_type = 'EVIDENCE_DIAGNOSIS' and audit_id is null and observation_run_id is null and diagnosis_run_id is not null and intervention_run_id is null)
  or (job_type = 'INTERVENTION_GENERATION' and audit_id is null and observation_run_id is null and diagnosis_run_id is null and intervention_run_id is not null)
);
create unique index idx_audit_queue_intervention_run on public.audit_queue(intervention_run_id) where intervention_run_id is not null;

create or replace function public.create_intervention_generation_run(
  p_project_id uuid, p_diagnosis_run_id uuid, p_input_hash text, p_buyer_question_set_hash text,
  p_observation_hash text, p_diagnosis_hash text, p_idempotency_key text, p_engine_version text,
  p_schema_version text, p_prompt_version text, p_generation_version text, p_priority_version text,
  p_model text, p_generation_parameters jsonb
)
returns table (run_id uuid, outcome text)
language plpgsql security definer set search_path = '' as $$
declare
  existing_id uuid; existing_status text; new_run_id uuid; source_project_id uuid;
  source_business_id uuid; source_set_id uuid; source_observation_id uuid; source_status text;
  source_business_version text; source_business_hash text; source_set_version text;
  source_observation_version text; source_diagnosis_version text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'service_role required' using errcode = '42501'; end if;
  select r.id into existing_id from public.intervention_generation_runs r where r.project_id = p_project_id and r.idempotency_key = p_idempotency_key;
  if existing_id is not null then return query select existing_id, 'EXISTING'::text; return; end if;
  select r.id, r.status into existing_id, existing_status from public.intervention_generation_runs r
    where r.project_id = p_project_id and r.input_hash = p_input_hash and r.engine_version = p_engine_version
      and r.generation_version = p_generation_version and r.priority_version = p_priority_version and r.status <> 'FAILED'
    order by r.created_at desc limit 1;
  if existing_id is not null then
    return query select existing_id, case when existing_status in ('COMPLETED','PARTIAL_SUCCESS','INCONCLUSIVE') then 'REUSED' else 'EXISTING' end;
    return;
  end if;

  select d.project_id, d.business_understanding_run_id, d.buyer_question_set_id, d.observation_run_id, d.status,
    d.business_understanding_version, d.business_understanding_content_hash, d.buyer_question_set_version,
    d.observation_engine_version, d.diagnosis_version
  into source_project_id, source_business_id, source_set_id, source_observation_id, source_status,
    source_business_version, source_business_hash, source_set_version, source_observation_version, source_diagnosis_version
  from public.evidence_diagnosis_runs d where d.id = p_diagnosis_run_id;
  if source_project_id is null or source_project_id <> p_project_id then raise exception 'Diagnosis run not found in project' using errcode = '23503'; end if;
  if source_status not in ('COMPLETED','PARTIAL_SUCCESS') then raise exception 'Diagnosis run is not finalized and usable' using errcode = '23514'; end if;
  if exists (select 1 from public.evidence_question_diagnoses q where q.run_id = p_diagnosis_run_id and q.status in ('PENDING','RUNNING')) then
    raise exception 'Diagnosis run contains unfinished questions' using errcode = '23514';
  end if;

  insert into public.intervention_generation_runs (
    project_id, diagnosis_run_id, business_understanding_run_id, buyer_question_set_id, observation_run_id,
    input_hash, idempotency_key, engine_version, schema_version, prompt_version, generation_version, priority_version,
    model, generation_parameters, business_understanding_version, business_understanding_hash,
    buyer_question_set_version, buyer_question_set_hash, observation_version, observation_hash,
    diagnosis_version, diagnosis_hash
  ) values (
    p_project_id, p_diagnosis_run_id, source_business_id, source_set_id, source_observation_id,
    p_input_hash, p_idempotency_key, p_engine_version, p_schema_version, p_prompt_version, p_generation_version, p_priority_version,
    p_model, p_generation_parameters, source_business_version, source_business_hash,
    source_set_version, p_buyer_question_set_hash, source_observation_version, p_observation_hash,
    source_diagnosis_version, p_diagnosis_hash
  ) returning id into new_run_id;
  insert into public.audit_queue (project_id, audit_id, observation_run_id, diagnosis_run_id, intervention_run_id, job_type, priority, status)
    values (p_project_id, null, null, null, new_run_id, 'INTERVENTION_GENERATION', 0, 'pending');
  return query select new_run_id, 'CREATED'::text;
exception when unique_violation then
  select r.id into existing_id from public.intervention_generation_runs r where r.project_id = p_project_id
    and (r.idempotency_key = p_idempotency_key or (r.input_hash = p_input_hash and r.status <> 'FAILED')) order by r.created_at desc limit 1;
  if existing_id is not null then return query select existing_id, 'EXISTING'::text; return; end if;
  raise;
end; $$;

create or replace function public.prepare_intervention_generation_run(p_run_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare current_status text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'service_role required' using errcode = '42501'; end if;
  select status into current_status from public.intervention_generation_runs where id = p_run_id for update;
  if current_status is null then raise exception 'Intervention run not found' using errcode = 'P0002'; end if;
  if current_status in ('COMPLETED','PARTIAL_SUCCESS','FAILED','INCONCLUSIVE') then return; end if;
  delete from public.generated_interventions where run_id = p_run_id;
  update public.intervention_generation_runs set status = 'RUNNING', started_at = coalesce(started_at, now()), completed_at = null,
    result_hash = null, intervention_count = 0, error_message = null where id = p_run_id;
end; $$;

create or replace function public.complete_intervention_generation_run(
  p_run_id uuid, p_result_hash text, p_eligible_gap_count integer, p_rejected_candidate_count integer,
  p_llm_call_count integer, p_input_tokens bigint, p_output_tokens bigint, p_cost_usd numeric,
  p_model_version text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare item_count integer; final_status text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'service_role required' using errcode = '42501'; end if;
  select count(*) into item_count from public.generated_interventions where run_id = p_run_id;
  final_status := case
    when item_count = 0 and p_eligible_gap_count = 0 then 'COMPLETED'
    when item_count > 0 and p_rejected_candidate_count > 0 then 'PARTIAL_SUCCESS'
    when item_count > 0 then 'COMPLETED'
    else 'INCONCLUSIVE' end;
  update public.intervention_generation_runs set status = final_status, result_hash = p_result_hash,
    eligible_gap_count = p_eligible_gap_count, intervention_count = item_count,
    rejected_candidate_count = p_rejected_candidate_count, llm_call_count = p_llm_call_count,
    input_tokens = p_input_tokens, output_tokens = p_output_tokens, cost_usd = p_cost_usd,
    model_version = p_model_version, completed_at = now(), error_message = null where id = p_run_id and status in ('PENDING','RUNNING');
  return p_run_id;
end; $$;

create or replace function public.guard_terminal_intervention_run()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  if old.status in ('COMPLETED','PARTIAL_SUCCESS','FAILED','INCONCLUSIVE') then raise exception 'Terminal intervention runs are immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

create or replace function public.guard_intervention_child()
returns trigger language plpgsql security definer set search_path = '' as $$
declare item_id uuid; parent_status text;
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  item_id := case when tg_op = 'INSERT' then new.intervention_id else old.intervention_id end;
  select r.status into parent_status from public.generated_interventions i join public.intervention_generation_runs r on r.id = i.run_id where i.id = item_id;
  if parent_status in ('COMPLETED','PARTIAL_SUCCESS','FAILED','INCONCLUSIVE') then raise exception 'Finalized intervention data is immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

create trigger intervention_run_immutable before update or delete on public.intervention_generation_runs for each row execute function public.guard_terminal_intervention_run();
create or replace function public.guard_generated_intervention()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_run_id uuid; parent_status text;
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  target_run_id := case when tg_op = 'INSERT' then new.run_id else old.run_id end;
  select status into parent_status from public.intervention_generation_runs where id = target_run_id;
  if parent_status in ('COMPLETED','PARTIAL_SUCCESS','FAILED','INCONCLUSIVE') then raise exception 'Finalized interventions are immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
create trigger generated_intervention_immutable before insert or update or delete on public.generated_interventions for each row execute function public.guard_generated_intervention();
create trigger intervention_question_immutable before insert or update or delete on public.intervention_question_links for each row execute function public.guard_intervention_child();
create trigger intervention_diagnosis_immutable before insert or update or delete on public.intervention_diagnosis_links for each row execute function public.guard_intervention_child();
create trigger intervention_evidence_immutable before insert or update or delete on public.intervention_evidence_links for each row execute function public.guard_intervention_child();
create trigger intervention_input_immutable before insert or update or delete on public.intervention_inputs for each row execute function public.guard_intervention_child();
create trigger intervention_acceptance_immutable before insert or update or delete on public.intervention_acceptance_criteria for each row execute function public.guard_intervention_child();
create trigger intervention_dependency_immutable before insert or update or delete on public.intervention_dependencies for each row execute function public.guard_intervention_child();
create trigger intervention_measurement_immutable before insert or update or delete on public.intervention_measurements for each row execute function public.guard_intervention_child();
create trigger intervention_provenance_immutable before insert or update or delete on public.intervention_provenance for each row execute function public.guard_intervention_child();
create trigger intervention_brief_immutable before insert or update or delete on public.intervention_content_briefs for each row execute function public.guard_intervention_child();
create trigger intervention_schema_immutable before insert or update or delete on public.intervention_structured_data for each row execute function public.guard_intervention_child();

alter table public.intervention_generation_runs enable row level security;
alter table public.generated_interventions enable row level security;
alter table public.intervention_question_links enable row level security;
alter table public.intervention_diagnosis_links enable row level security;
alter table public.intervention_evidence_links enable row level security;
alter table public.intervention_inputs enable row level security;
alter table public.intervention_acceptance_criteria enable row level security;
alter table public.intervention_dependencies enable row level security;
alter table public.intervention_measurements enable row level security;
alter table public.intervention_provenance enable row level security;
alter table public.intervention_content_briefs enable row level security;
alter table public.intervention_structured_data enable row level security;

create policy "Clerk owner can read intervention runs" on public.intervention_generation_runs for select to authenticated using (exists (select 1 from public.projects p where p.id = intervention_generation_runs.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read interventions" on public.generated_interventions for select to authenticated using (exists (select 1 from public.projects p where p.id = generated_interventions.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read intervention question links" on public.intervention_question_links for select to authenticated using (exists (select 1 from public.projects p where p.id = intervention_question_links.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read intervention diagnosis links" on public.intervention_diagnosis_links for select to authenticated using (exists (select 1 from public.projects p where p.id = intervention_diagnosis_links.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read intervention evidence links" on public.intervention_evidence_links for select to authenticated using (exists (select 1 from public.projects p where p.id = intervention_evidence_links.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read intervention inputs" on public.intervention_inputs for select to authenticated using (exists (select 1 from public.projects p where p.id = intervention_inputs.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read intervention acceptance" on public.intervention_acceptance_criteria for select to authenticated using (exists (select 1 from public.projects p where p.id = intervention_acceptance_criteria.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read intervention dependencies" on public.intervention_dependencies for select to authenticated using (exists (select 1 from public.projects p where p.id = intervention_dependencies.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read intervention measurements" on public.intervention_measurements for select to authenticated using (exists (select 1 from public.projects p where p.id = intervention_measurements.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read intervention provenance" on public.intervention_provenance for select to authenticated using (exists (select 1 from public.projects p where p.id = intervention_provenance.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read intervention briefs" on public.intervention_content_briefs for select to authenticated using (exists (select 1 from public.projects p where p.id = intervention_content_briefs.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read intervention structured data" on public.intervention_structured_data for select to authenticated using (exists (select 1 from public.projects p where p.id = intervention_structured_data.project_id and p.user_id = public.current_clerk_profile_id()));

revoke insert, update, delete on public.intervention_generation_runs, public.generated_interventions, public.intervention_question_links,
  public.intervention_diagnosis_links, public.intervention_evidence_links, public.intervention_inputs,
  public.intervention_acceptance_criteria, public.intervention_dependencies, public.intervention_measurements,
  public.intervention_provenance, public.intervention_content_briefs, public.intervention_structured_data from anon, authenticated;
revoke all on function public.create_intervention_generation_run(uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.prepare_intervention_generation_run(uuid) from public, anon, authenticated;
revoke all on function public.complete_intervention_generation_run(uuid,text,integer,integer,integer,bigint,bigint,numeric,text) from public, anon, authenticated;
revoke execute on function public.guard_terminal_intervention_run() from public, anon, authenticated;
revoke execute on function public.guard_generated_intervention() from public, anon, authenticated;
revoke execute on function public.guard_intervention_child() from public, anon, authenticated;
grant execute on function public.create_intervention_generation_run(uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,jsonb) to service_role;
grant execute on function public.prepare_intervention_generation_run(uuid) to service_role;
grant execute on function public.complete_intervention_generation_run(uuid,text,integer,integer,integer,bigint,bigint,numeric,text) to service_role;
