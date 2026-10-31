-- Engine 04: deterministic evidence assessment and diagnosis.
-- Additive only. Engines 01-03 and the legacy audit/report pipeline remain unchanged.

create table public.evidence_diagnosis_runs (
  id uuid primary key default extensions.uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  business_understanding_run_id uuid not null,
  buyer_question_set_id uuid not null,
  observation_run_id uuid not null,
  status text not null default 'PENDING' check (status in ('PENDING','RUNNING','PARTIAL_SUCCESS','COMPLETED','FAILED','INCONCLUSIVE')),
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 128),
  engine_version text not null,
  prompt_version text not null,
  schema_version text not null,
  diagnosis_version text not null,
  matching_version text not null,
  model text,
  model_version text,
  business_understanding_version text not null,
  business_understanding_content_hash text not null,
  buyer_question_set_version text not null,
  buyer_question_set_hash text not null check (buyer_question_set_hash ~ '^[0-9a-f]{64}$'),
  observation_engine_version text not null,
  observation_run_hash text not null check (observation_run_hash ~ '^[0-9a-f]{64}$'),
  requested_question_count integer not null check (requested_question_count between 1 and 30),
  completed_question_count integer not null default 0 check (completed_question_count >= 0),
  failed_question_count integer not null default 0 check (failed_question_count >= 0),
  inconclusive_question_count integer not null default 0 check (inconclusive_question_count >= 0),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  gap_count integer not null default 0 check (gap_count >= 0),
  llm_call_count integer not null default 0 check (llm_call_count >= 0),
  input_tokens bigint,
  output_tokens bigint,
  cost_usd numeric(14,8) not null default 0 check (cost_usd >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, project_id),
  unique (project_id, idempotency_key),
  foreign key (business_understanding_run_id, project_id) references public.business_understanding_runs(id, project_id) on delete restrict,
  foreign key (buyer_question_set_id, project_id) references public.buyer_question_sets(id, project_id) on delete restrict,
  foreign key (observation_run_id, project_id) references public.ai_observation_runs(id, project_id) on delete restrict,
  check (completed_question_count + failed_question_count + inconclusive_question_count <= requested_question_count)
);

create unique index idx_evidence_diagnosis_exact_active_or_complete
  on public.evidence_diagnosis_runs(project_id, input_hash, engine_version, diagnosis_version, matching_version)
  where status <> 'FAILED';
create index idx_evidence_diagnosis_project_created on public.evidence_diagnosis_runs(project_id, created_at desc);
create index idx_evidence_diagnosis_status on public.evidence_diagnosis_runs(status, created_at);

create table public.evidence_question_diagnoses (
  id uuid primary key default extensions.uuid_generate_v4(),
  run_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  diagnosis_key text not null,
  buyer_question_id uuid not null,
  buyer_question_key text not null,
  question_observation_id uuid not null,
  exact_question text not null,
  question_rank integer not null,
  status text not null default 'PENDING' check (status in ('PENDING','RUNNING','COMPLETED','FAILED','INCONCLUSIVE')),
  target_mention_status text not null default 'INCONCLUSIVE' check (target_mention_status in ('MENTIONED','NOT_MENTIONED','INCONCLUSIVE')),
  classifications text[] not null default '{}'::text[],
  primary_classification text,
  commercial_implication text not null default 'UNKNOWN' check (commercial_implication in ('HIGH','MEDIUM','LOW','UNKNOWN')),
  confidence text not null default 'UNKNOWN' check (confidence in ('HIGH','MEDIUM','LOW','UNKNOWN')),
  evidence_scope text not null default 'UNKNOWN' check (evidence_scope in ('INSPECTED_FOUND','INSPECTED_NOT_FOUND','NOT_SEARCHED','INACCESSIBLE','PARTIALLY_INSPECTED','UNKNOWN')),
  evidence_comparison text not null default 'INCONCLUSIVE' check (evidence_comparison in ('TARGET_STRONGER','OBSERVED_STRONGER','COMPARABLE','INCONCLUSIVE')),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, project_id),
  unique (run_id, buyer_question_id),
  unique (run_id, buyer_question_key),
  foreign key (run_id, project_id) references public.evidence_diagnosis_runs(id, project_id) on delete cascade,
  foreign key (buyer_question_id, project_id) references public.buyer_questions(id, project_id) on delete restrict,
  foreign key (question_observation_id, project_id) references public.ai_question_observations(id, project_id) on delete restrict
);

create index idx_evidence_question_run_rank on public.evidence_question_diagnoses(run_id, question_rank);

create table public.evidence_assessments (
  id uuid primary key default extensions.uuid_generate_v4(),
  question_diagnosis_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  assessment_key text not null,
  origin text not null check (origin in ('TARGET_BUSINESS','OBSERVED_ENTITY','AI_OBSERVATION','CITATION_REFERENCE')),
  subject_entity_key text,
  evidence_type text not null check (evidence_type in ('IDENTITY','PRODUCT','SERVICE','CAPABILITY','INDUSTRY','USE_CASE','BUYER_TYPE','GEOGRAPHY','TECHNICAL_SPECIFICATION','COMPLIANCE','CERTIFICATION','STANDARD','APPLICATION','CASE_STUDY','CUSTOMER_PROOF','MANUFACTURING','FACILITY','ORDER_INFORMATION','DISTRIBUTION','BRAND_AUTHORITY','THIRD_PARTY_MENTION','PUBLICATION','OTHER')),
  evidence_status text not null check (evidence_status in ('SUPPORTED','PARTIALLY_SUPPORTED','WEAK','MISSING','CONFLICTING','AMBIGUOUS','STALE','UNVERIFIED','NOT_APPLICABLE','UNKNOWN')),
  relevance text not null check (relevance in ('DIRECT','RELATED','LOW','UNKNOWN')),
  specificity text not null check (specificity in ('EXACT','SPECIFIC','GENERAL','UNKNOWN')),
  directness text not null check (directness in ('DIRECT','INDIRECT','OBSERVED_ONLY','UNKNOWN')),
  freshness text not null check (freshness in ('CURRENT','RECENT','DATED','STALE','UNKNOWN')),
  source_reliability text not null check (source_reliability in ('PRIMARY','INDEPENDENT','DIRECTORY','COMMUNITY','AI_GENERATED','UNKNOWN')),
  source_hierarchy text not null check (source_hierarchy in ('OFFICIAL_WEBSITE','OFFICIAL_DOCUMENT','OFFICIAL_PROFILE','REGULATORY','CERTIFICATION_BODY','TRUSTED_THIRD_PARTY','DIRECTORY','MARKETPLACE','SOCIAL','FORUM','AI_GENERATED','UNKNOWN')),
  provenance_completeness text not null check (provenance_completeness in ('COMPLETE','PARTIAL','MISSING')),
  confidence text not null check (confidence in ('HIGH','MEDIUM','LOW','UNKNOWN')),
  evidence_scope text not null check (evidence_scope in ('INSPECTED_FOUND','INSPECTED_NOT_FOUND','NOT_SEARCHED','INACCESSIBLE','PARTIALLY_INSPECTED','UNKNOWN')),
  statement text not null,
  created_at timestamptz not null default now(),
  unique (question_diagnosis_id, assessment_key),
  foreign key (question_diagnosis_id, project_id) references public.evidence_question_diagnoses(id, project_id) on delete cascade
);

create table public.evidence_gaps (
  id uuid primary key default extensions.uuid_generate_v4(),
  question_diagnosis_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  gap_key text not null,
  gap_type text not null,
  question_dimension text not null,
  description text not null,
  target_evidence_present boolean not null,
  observed_entity_evidence_present boolean not null,
  evidence_strength text not null check (evidence_strength in ('HIGH','MEDIUM','LOW','UNKNOWN')),
  confidence text not null check (confidence in ('HIGH','MEDIUM','LOW','UNKNOWN')),
  evidence_scope text not null check (evidence_scope in ('INSPECTED_FOUND','INSPECTED_NOT_FOUND','NOT_SEARCHED','INACCESSIBLE','PARTIALLY_INSPECTED','UNKNOWN')),
  created_at timestamptz not null default now(),
  unique (id, question_diagnosis_id),
  unique (question_diagnosis_id, gap_key),
  foreign key (question_diagnosis_id, project_id) references public.evidence_question_diagnoses(id, project_id) on delete cascade
);

create table public.evidence_gap_support (
  gap_id uuid not null,
  question_diagnosis_id uuid not null,
  source_evidence_key text not null,
  primary key (gap_id, source_evidence_key),
  foreign key (gap_id, question_diagnosis_id) references public.evidence_gaps(id, question_diagnosis_id) on delete cascade
);

create table public.diagnosis_claims (
  id uuid primary key default extensions.uuid_generate_v4(),
  question_diagnosis_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  claim_key text not null,
  classification text not null,
  statement text not null,
  confidence text not null check (confidence in ('HIGH','MEDIUM','LOW','UNKNOWN')),
  created_at timestamptz not null default now(),
  unique (question_diagnosis_id, claim_key),
  foreign key (question_diagnosis_id, project_id) references public.evidence_question_diagnoses(id, project_id) on delete cascade
);

create table public.diagnosed_entity_relationships (
  id uuid primary key default extensions.uuid_generate_v4(),
  question_diagnosis_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  relationship_key text not null,
  observed_entity_key text not null,
  surface_form text not null,
  relationship text not null check (relationship in ('TARGET','OBSERVED_ENTITY','POTENTIAL_ALTERNATIVE','POTENTIAL_COMPETITOR','RELATED_ENTITY','UNKNOWN')),
  confidence text not null check (confidence in ('HIGH','MEDIUM','LOW','UNKNOWN')),
  rationale text not null,
  created_at timestamptz not null default now(),
  unique (question_diagnosis_id, relationship_key),
  foreign key (question_diagnosis_id, project_id) references public.evidence_question_diagnoses(id, project_id) on delete cascade
);

create table public.diagnosis_unknowns (
  id uuid primary key default extensions.uuid_generate_v4(),
  question_diagnosis_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  unknown_key text not null,
  area text not null,
  reason text not null check (reason in ('NOT_INSPECTED','INACCESSIBLE','AMBIGUOUS','UNSUPPORTED','OBSERVATION_FAILURE','PARSER_FAILURE')),
  detail text not null,
  created_at timestamptz not null default now(),
  unique (question_diagnosis_id, unknown_key),
  foreign key (question_diagnosis_id, project_id) references public.evidence_question_diagnoses(id, project_id) on delete cascade
);

create table public.diagnosis_provenance (
  id uuid primary key default extensions.uuid_generate_v4(),
  question_diagnosis_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  artifact_kind text not null check (artifact_kind in ('ASSESSMENT','GAP','CLAIM','ENTITY_RELATIONSHIP','UNKNOWN')),
  artifact_key text not null,
  provenance_kind text not null check (provenance_kind in ('BUSINESS_EVIDENCE','BUSINESS_ENTITY','BUSINESS_CONFLICT','BUSINESS_UNKNOWN','QUESTION','AI_OBSERVATION','OBSERVED_ENTITY','CITATION','SOURCE')),
  source_key text not null,
  source_url text,
  source_title text,
  source_type text,
  snippet text,
  source_timestamp timestamptz,
  created_at timestamptz not null default now(),
  unique (question_diagnosis_id, artifact_kind, artifact_key, provenance_kind, source_key),
  foreign key (question_diagnosis_id, project_id) references public.evidence_question_diagnoses(id, project_id) on delete cascade
);

alter table public.audit_queue drop constraint if exists audit_queue_job_type_check;
alter table public.audit_queue drop constraint if exists audit_queue_job_target_check;
alter table public.audit_queue add column diagnosis_run_id uuid references public.evidence_diagnosis_runs(id) on delete cascade;
alter table public.audit_queue add constraint audit_queue_job_type_check check (job_type in ('AUDIT','AI_OBSERVATION','EVIDENCE_DIAGNOSIS'));
alter table public.audit_queue add constraint audit_queue_job_target_check check (
  (job_type = 'AUDIT' and observation_run_id is null and diagnosis_run_id is null)
  or (job_type = 'AI_OBSERVATION' and audit_id is null and observation_run_id is not null and diagnosis_run_id is null)
  or (job_type = 'EVIDENCE_DIAGNOSIS' and audit_id is null and observation_run_id is null and diagnosis_run_id is not null)
);
create unique index idx_audit_queue_diagnosis_run on public.audit_queue(diagnosis_run_id) where diagnosis_run_id is not null;

create or replace function public.create_evidence_diagnosis_run(
  p_project_id uuid, p_observation_run_id uuid, p_input_hash text,
  p_buyer_question_set_hash text, p_observation_run_hash text, p_idempotency_key text,
  p_engine_version text, p_prompt_version text, p_schema_version text,
  p_diagnosis_version text, p_matching_version text
)
returns table (run_id uuid, outcome text)
language plpgsql security definer set search_path = '' as $$
declare
  existing_id uuid; existing_status text; new_run_id uuid; question_total integer;
  source_project_id uuid; source_set_id uuid; source_business_id uuid; source_observation_version text;
  source_business_version text; source_business_hash text; source_set_version text; source_status text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'service_role required' using errcode = '42501'; end if;
  select r.id into existing_id from public.evidence_diagnosis_runs r where r.project_id = p_project_id and r.idempotency_key = p_idempotency_key;
  if existing_id is not null then return query select existing_id, 'EXISTING'::text; return; end if;

  select r.id, r.status into existing_id, existing_status from public.evidence_diagnosis_runs r
    where r.project_id = p_project_id and r.input_hash = p_input_hash and r.engine_version = p_engine_version
      and r.diagnosis_version = p_diagnosis_version and r.matching_version = p_matching_version and r.status <> 'FAILED'
    order by r.created_at desc limit 1;
  if existing_id is not null then
    return query select existing_id,
      case when existing_status in ('COMPLETED','PARTIAL_SUCCESS','INCONCLUSIVE') then 'REUSED' else 'EXISTING' end;
    return;
  end if;

  select o.project_id, o.buyer_question_set_id, o.business_understanding_run_id, o.engine_version, o.status,
    s.question_count, b.extraction_version, b.content_hash, i.engine_version
  into source_project_id, source_set_id, source_business_id, source_observation_version, source_status,
    question_total, source_business_version, source_business_hash, source_set_version
  from public.ai_observation_runs o
  join public.buyer_question_sets s on s.id = o.buyer_question_set_id and s.project_id = o.project_id and s.is_frozen
  join public.business_understanding_runs b on b.id = o.business_understanding_run_id and b.project_id = o.project_id
    and b.status in ('SUCCESS','PARTIAL_SUCCESS')
  join public.buyer_intent_runs i on i.id = s.run_id and i.project_id = s.project_id
    and i.status in ('COMPLETED','PARTIAL_SUCCESS')
  where o.id = p_observation_run_id;

  if source_project_id is null or source_project_id <> p_project_id then raise exception 'Observation run not found in project' using errcode = '23503'; end if;
  if source_status not in ('COMPLETED','PARTIAL_SUCCESS') then raise exception 'Observation run is not complete' using errcode = '23514'; end if;
  if question_total is null or question_total < 1 then raise exception 'Frozen question set is empty' using errcode = '23514'; end if;
  if (select count(*) from public.ai_question_observations q where q.run_id = p_observation_run_id and q.status in ('COMPLETED','FAILED')) <> question_total then
    raise exception 'Observation run has unfinished or missing question records' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.ai_question_observations o
    join public.buyer_questions q on q.id = o.buyer_question_id
    where o.run_id = p_observation_run_id and (o.buyer_question_key <> q.question_key or o.exact_question <> q.question)
  ) then raise exception 'Observation does not match frozen buyer question' using errcode = '23514'; end if;

  insert into public.evidence_diagnosis_runs (
    project_id, business_understanding_run_id, buyer_question_set_id, observation_run_id, input_hash,
    idempotency_key, engine_version, prompt_version, schema_version, diagnosis_version, matching_version,
    business_understanding_version, business_understanding_content_hash, buyer_question_set_version,
    buyer_question_set_hash, observation_engine_version, observation_run_hash, requested_question_count
  ) values (
    p_project_id, source_business_id, source_set_id, p_observation_run_id, p_input_hash,
    p_idempotency_key, p_engine_version, p_prompt_version, p_schema_version, p_diagnosis_version, p_matching_version,
    source_business_version, source_business_hash, source_set_version, p_buyer_question_set_hash,
    source_observation_version, p_observation_run_hash, question_total
  ) returning id into new_run_id;

  insert into public.evidence_question_diagnoses (
    run_id, project_id, diagnosis_key, buyer_question_id, buyer_question_key, question_observation_id, exact_question, question_rank
  ) select new_run_id, p_project_id, q.question_key || ':' || o.id::text, q.id, q.question_key, o.id, q.question, q.rank
    from public.buyer_questions q
    join public.ai_question_observations o on o.buyer_question_id = q.id and o.run_id = p_observation_run_id
    where q.question_set_id = source_set_id order by q.rank;

  insert into public.audit_queue (project_id, audit_id, observation_run_id, diagnosis_run_id, job_type, priority, status)
    values (p_project_id, null, null, new_run_id, 'EVIDENCE_DIAGNOSIS', 0, 'pending');
  return query select new_run_id, 'CREATED'::text;
exception when unique_violation then
  select r.id into existing_id from public.evidence_diagnosis_runs r where r.project_id = p_project_id and r.idempotency_key = p_idempotency_key;
  if existing_id is null then
    select r.id into existing_id from public.evidence_diagnosis_runs r
      where r.project_id = p_project_id and r.input_hash = p_input_hash and r.status <> 'FAILED'
      order by r.created_at desc limit 1;
  end if;
  if existing_id is not null then return query select existing_id, 'EXISTING'::text; return; end if;
  raise;
end; $$;

alter table public.evidence_question_diagnoses add constraint evidence_question_classifications_check check (
  classifications <@ array['NO_TARGET_MENTION','TARGET_MENTIONED_WEAKLY','TARGET_MENTIONED_BUT_NOT_PREFERRED','TARGET_RELEVANCE_EVIDENCE_GAP','TARGET_SPECIFICITY_GAP','TARGET_PROOF_GAP','TARGET_AUTHORITY_GAP','TARGET_CITATION_GAP','TARGET_ENTITY_RECOGNITION_GAP','TARGET_GEOGRAPHY_EVIDENCE_GAP','TARGET_INDUSTRY_EVIDENCE_GAP','TARGET_USE_CASE_EVIDENCE_GAP','TARGET_TECHNICAL_EVIDENCE_GAP','TARGET_COMPLIANCE_EVIDENCE_GAP','OBSERVED_ENTITY_HAS_STRONGER_RELEVANT_EVIDENCE','CONFLICTING_EVIDENCE','INSUFFICIENT_OBSERVATION','INCONCLUSIVE']::text[]
  and (primary_classification is null or primary_classification = any(array['NO_TARGET_MENTION','TARGET_MENTIONED_WEAKLY','TARGET_MENTIONED_BUT_NOT_PREFERRED','TARGET_RELEVANCE_EVIDENCE_GAP','TARGET_SPECIFICITY_GAP','TARGET_PROOF_GAP','TARGET_AUTHORITY_GAP','TARGET_CITATION_GAP','TARGET_ENTITY_RECOGNITION_GAP','TARGET_GEOGRAPHY_EVIDENCE_GAP','TARGET_INDUSTRY_EVIDENCE_GAP','TARGET_USE_CASE_EVIDENCE_GAP','TARGET_TECHNICAL_EVIDENCE_GAP','TARGET_COMPLIANCE_EVIDENCE_GAP','OBSERVED_ENTITY_HAS_STRONGER_RELEVANT_EVIDENCE','CONFLICTING_EVIDENCE','INSUFFICIENT_OBSERVATION','INCONCLUSIVE']::text[]))
);
alter table public.evidence_gaps add constraint evidence_gap_type_check check (
  gap_type = any(array['NO_TARGET_MENTION','TARGET_MENTIONED_WEAKLY','TARGET_MENTIONED_BUT_NOT_PREFERRED','TARGET_RELEVANCE_EVIDENCE_GAP','TARGET_SPECIFICITY_GAP','TARGET_PROOF_GAP','TARGET_AUTHORITY_GAP','TARGET_CITATION_GAP','TARGET_ENTITY_RECOGNITION_GAP','TARGET_GEOGRAPHY_EVIDENCE_GAP','TARGET_INDUSTRY_EVIDENCE_GAP','TARGET_USE_CASE_EVIDENCE_GAP','TARGET_TECHNICAL_EVIDENCE_GAP','TARGET_COMPLIANCE_EVIDENCE_GAP','OBSERVED_ENTITY_HAS_STRONGER_RELEVANT_EVIDENCE','CONFLICTING_EVIDENCE','INSUFFICIENT_OBSERVATION','INCONCLUSIVE']::text[])
);
alter table public.diagnosis_claims add constraint diagnosis_claim_classification_check check (
  classification = any(array['NO_TARGET_MENTION','TARGET_MENTIONED_WEAKLY','TARGET_MENTIONED_BUT_NOT_PREFERRED','TARGET_RELEVANCE_EVIDENCE_GAP','TARGET_SPECIFICITY_GAP','TARGET_PROOF_GAP','TARGET_AUTHORITY_GAP','TARGET_CITATION_GAP','TARGET_ENTITY_RECOGNITION_GAP','TARGET_GEOGRAPHY_EVIDENCE_GAP','TARGET_INDUSTRY_EVIDENCE_GAP','TARGET_USE_CASE_EVIDENCE_GAP','TARGET_TECHNICAL_EVIDENCE_GAP','TARGET_COMPLIANCE_EVIDENCE_GAP','OBSERVED_ENTITY_HAS_STRONGER_RELEVANT_EVIDENCE','CONFLICTING_EVIDENCE','INSUFFICIENT_OBSERVATION','INCONCLUSIVE']::text[])
);

create or replace function public.guard_terminal_diagnosis_run()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  if old.status in ('COMPLETED','PARTIAL_SUCCESS','FAILED','INCONCLUSIVE') then raise exception 'Terminal diagnosis runs are immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

create or replace function public.guard_terminal_question_diagnosis()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  if old.status in ('COMPLETED','INCONCLUSIVE') then raise exception 'Terminal question diagnoses are immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

create or replace function public.guard_diagnosis_child()
returns trigger language plpgsql security definer set search_path = '' as $$
declare diagnosis_id uuid;
begin
  diagnosis_id := case when tg_op = 'INSERT' then new.question_diagnosis_id else old.question_diagnosis_id end;
  if exists (select 1 from public.evidence_question_diagnoses q where q.id = diagnosis_id and q.status in ('COMPLETED','INCONCLUSIVE')) then
    raise exception 'Terminal question diagnosis data is immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

create trigger evidence_diagnosis_run_immutable before update or delete on public.evidence_diagnosis_runs for each row execute function public.guard_terminal_diagnosis_run();
create trigger evidence_question_diagnosis_immutable before update or delete on public.evidence_question_diagnoses for each row execute function public.guard_terminal_question_diagnosis();
create trigger evidence_assessment_immutable before insert or update or delete on public.evidence_assessments for each row execute function public.guard_diagnosis_child();
create trigger evidence_gap_immutable before insert or update or delete on public.evidence_gaps for each row execute function public.guard_diagnosis_child();
create trigger evidence_gap_support_immutable before insert or update or delete on public.evidence_gap_support for each row execute function public.guard_diagnosis_child();
create trigger diagnosis_claim_immutable before insert or update or delete on public.diagnosis_claims for each row execute function public.guard_diagnosis_child();
create trigger diagnosis_relationship_immutable before insert or update or delete on public.diagnosed_entity_relationships for each row execute function public.guard_diagnosis_child();
create trigger diagnosis_unknown_immutable before insert or update or delete on public.diagnosis_unknowns for each row execute function public.guard_diagnosis_child();
create trigger diagnosis_provenance_immutable before insert or update or delete on public.diagnosis_provenance for each row execute function public.guard_diagnosis_child();

alter table public.evidence_diagnosis_runs enable row level security;
alter table public.evidence_question_diagnoses enable row level security;
alter table public.evidence_assessments enable row level security;
alter table public.evidence_gaps enable row level security;
alter table public.evidence_gap_support enable row level security;
alter table public.diagnosis_claims enable row level security;
alter table public.diagnosed_entity_relationships enable row level security;
alter table public.diagnosis_unknowns enable row level security;
alter table public.diagnosis_provenance enable row level security;

create policy "Clerk owner can read evidence diagnosis runs" on public.evidence_diagnosis_runs for select to authenticated using (exists (select 1 from public.projects p where p.id = evidence_diagnosis_runs.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read question diagnoses" on public.evidence_question_diagnoses for select to authenticated using (exists (select 1 from public.projects p where p.id = evidence_question_diagnoses.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read evidence assessments" on public.evidence_assessments for select to authenticated using (exists (select 1 from public.projects p where p.id = evidence_assessments.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read evidence gaps" on public.evidence_gaps for select to authenticated using (exists (select 1 from public.projects p where p.id = evidence_gaps.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read gap support" on public.evidence_gap_support for select to authenticated using (exists (select 1 from public.evidence_question_diagnoses q join public.projects p on p.id = q.project_id where q.id = evidence_gap_support.question_diagnosis_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read diagnosis claims" on public.diagnosis_claims for select to authenticated using (exists (select 1 from public.projects p where p.id = diagnosis_claims.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read entity relationships" on public.diagnosed_entity_relationships for select to authenticated using (exists (select 1 from public.projects p where p.id = diagnosed_entity_relationships.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read diagnosis unknowns" on public.diagnosis_unknowns for select to authenticated using (exists (select 1 from public.projects p where p.id = diagnosis_unknowns.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read diagnosis provenance" on public.diagnosis_provenance for select to authenticated using (exists (select 1 from public.projects p where p.id = diagnosis_provenance.project_id and p.user_id = public.current_clerk_profile_id()));

create or replace function public.prepare_evidence_question_diagnosis(p_run_id uuid, p_buyer_question_key text)
returns void language plpgsql security definer set search_path = '' as $$
declare diagnosis_id uuid; current_status text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'service_role required' using errcode = '42501'; end if;
  select q.id, q.status into diagnosis_id, current_status from public.evidence_question_diagnoses q
    where q.run_id = p_run_id and q.buyer_question_key = p_buyer_question_key for update;
  if diagnosis_id is null then raise exception 'Question diagnosis not found' using errcode = 'P0002'; end if;
  if current_status in ('COMPLETED','INCONCLUSIVE') then return; end if;
  delete from public.diagnosis_provenance where question_diagnosis_id = diagnosis_id;
  delete from public.diagnosis_unknowns where question_diagnosis_id = diagnosis_id;
  delete from public.diagnosed_entity_relationships where question_diagnosis_id = diagnosis_id;
  delete from public.diagnosis_claims where question_diagnosis_id = diagnosis_id;
  delete from public.evidence_gap_support where question_diagnosis_id = diagnosis_id;
  delete from public.evidence_gaps where question_diagnosis_id = diagnosis_id;
  delete from public.evidence_assessments where question_diagnosis_id = diagnosis_id;
  update public.evidence_question_diagnoses set status = 'RUNNING', started_at = now(), completed_at = null,
    classifications = '{}'::text[], primary_classification = null, error_message = null where id = diagnosis_id;
end; $$;

create or replace function public.complete_evidence_diagnosis_run(p_run_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare completed_count integer; failed_count integer; inconclusive_count integer; unfinished_count integer; final_status text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'service_role required' using errcode = '42501'; end if;
  select count(*) filter (where status = 'COMPLETED'), count(*) filter (where status = 'FAILED'),
    count(*) filter (where status = 'INCONCLUSIVE'), count(*) filter (where status in ('PENDING','RUNNING'))
    into completed_count, failed_count, inconclusive_count, unfinished_count
    from public.evidence_question_diagnoses where run_id = p_run_id;
  if unfinished_count > 0 then raise exception 'Diagnosis run still has unfinished questions' using errcode = '23514'; end if;
  final_status := case when failed_count = 0 and inconclusive_count = 0 then 'COMPLETED'
    when completed_count > 0 then 'PARTIAL_SUCCESS'
    when failed_count = 0 and inconclusive_count > 0 then 'INCONCLUSIVE' else 'FAILED' end;
  update public.evidence_diagnosis_runs r set status = final_status, completed_question_count = completed_count,
    failed_question_count = failed_count, inconclusive_question_count = inconclusive_count, completed_at = now(),
    evidence_count = (select count(*) from public.evidence_assessments a join public.evidence_question_diagnoses q on q.id = a.question_diagnosis_id where q.run_id = p_run_id),
    gap_count = (select count(*) from public.evidence_gaps g join public.evidence_question_diagnoses q on q.id = g.question_diagnosis_id where q.run_id = p_run_id),
    llm_call_count = 0, input_tokens = null, output_tokens = null, cost_usd = 0
    where r.id = p_run_id and r.status in ('PENDING','RUNNING');
  return p_run_id;
end; $$;

revoke insert, update, delete on public.evidence_diagnosis_runs, public.evidence_question_diagnoses, public.evidence_assessments,
  public.evidence_gaps, public.evidence_gap_support, public.diagnosis_claims, public.diagnosed_entity_relationships,
  public.diagnosis_unknowns, public.diagnosis_provenance from anon, authenticated;
revoke all on function public.create_evidence_diagnosis_run(uuid,uuid,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.prepare_evidence_question_diagnosis(uuid,text) from public, anon, authenticated;
revoke all on function public.complete_evidence_diagnosis_run(uuid) from public, anon, authenticated;
revoke execute on function public.guard_terminal_diagnosis_run() from public, anon, authenticated;
revoke execute on function public.guard_terminal_question_diagnosis() from public, anon, authenticated;
revoke execute on function public.guard_diagnosis_child() from public, anon, authenticated;
grant execute on function public.create_evidence_diagnosis_run(uuid,uuid,text,text,text,text,text,text,text,text,text) to service_role;
grant execute on function public.prepare_evidence_question_diagnosis(uuid,text) to service_role;
grant execute on function public.complete_evidence_diagnosis_run(uuid) to service_role;
