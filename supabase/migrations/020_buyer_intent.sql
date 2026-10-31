-- Engine 02: versioned, evidence-grounded, frozen buyer-question benchmarks.
-- COMPLETED means the requested count passed all quality gates. PARTIAL_SUCCESS
-- means a smaller defensible set was frozen rather than padding with weak questions.

create table if not exists public.buyer_intent_runs (
  id uuid primary key default extensions.uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  business_understanding_run_id uuid not null,
  status text not null check (status in ('PENDING','RUNNING','PARTIAL_SUCCESS','COMPLETED','FAILED')),
  requested_question_count integer not null check (requested_question_count between 1 and 30),
  candidate_count integer not null default 0 check (candidate_count >= 0),
  selected_question_count integer not null default 0 check (selected_question_count >= 0),
  rejected_candidate_count integer not null default 0 check (rejected_candidate_count >= 0),
  engine_version text not null,
  prompt_version text not null,
  schema_version text not null,
  generation_version text not null,
  ranking_version text not null,
  business_understanding_version text not null,
  business_understanding_content_hash text not null,
  model text not null,
  warnings jsonb not null default '[]'::jsonb,
  failure_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, project_id),
  unique (project_id, business_understanding_run_id, engine_version, prompt_version,
    schema_version, generation_version, ranking_version, requested_question_count),
  foreign key (business_understanding_run_id, project_id)
    references public.business_understanding_runs(id, project_id) on delete cascade
);

create table if not exists public.buyer_question_sets (
  id uuid primary key default extensions.uuid_generate_v4(),
  run_id uuid not null unique,
  project_id uuid not null references public.projects(id) on delete cascade,
  business_understanding_run_id uuid not null,
  set_key text not null unique,
  is_frozen boolean not null default false,
  question_count integer not null default 0 check (question_count between 0 and 30),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, project_id),
  foreign key (run_id, project_id) references public.buyer_intent_runs(id, project_id) on delete cascade,
  foreign key (business_understanding_run_id, project_id)
    references public.business_understanding_runs(id, project_id) on delete cascade,
  check ((is_frozen and finalized_at is not null) or (not is_frozen and finalized_at is null))
);

create table if not exists public.buyer_questions (
  id uuid primary key default extensions.uuid_generate_v4(),
  question_set_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  question_key text not null,
  question text not null,
  normalized_question text not null,
  intent text not null check (intent in ('DISCOVERY','COMPARISON','SHORTLIST','VENDOR_SELECTION','PURCHASE','SPECIFICATION','COMPLIANCE','ALTERNATIVE','GEOGRAPHIC')),
  buyer_stage text not null check (buyer_stage in ('AWARENESS','RESEARCH','EVALUATION','SHORTLISTING','DECISION','PURCHASE')),
  commercial_relevance integer not null check (commercial_relevance between 1 and 5),
  business_relevance integer not null check (business_relevance between 1 and 5),
  specificity integer not null check (specificity between 1 and 5),
  dimensions jsonb not null default '[]'::jsonb,
  rationale text not null,
  supporting_business_evidence_keys jsonb not null default '[]'::jsonb,
  supporting_business_entity_keys jsonb not null default '[]'::jsonb,
  confidence text not null check (confidence in ('HIGH','MEDIUM','LOW')),
  priority_score integer not null check (priority_score between 0 and 100),
  rank integer not null check (rank between 1 and 30),
  created_at timestamptz not null default now(),
  unique (question_set_id, question_key),
  unique (question_set_id, normalized_question),
  unique (question_set_id, rank),
  foreign key (question_set_id, project_id) references public.buyer_question_sets(id, project_id) on delete cascade
);

create index if not exists idx_buyer_intent_runs_project_created on public.buyer_intent_runs(project_id, created_at desc);
create index if not exists idx_buyer_intent_runs_business_understanding on public.buyer_intent_runs(business_understanding_run_id);
create index if not exists idx_buyer_questions_set_rank on public.buyer_questions(question_set_id, rank);

create or replace function public.guard_frozen_buyer_questions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_set_id uuid;
begin
  target_set_id := case when tg_op = 'INSERT' then new.question_set_id else old.question_set_id end;
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  if exists (select 1 from public.buyer_question_sets where id = target_set_id and is_frozen) then
    raise exception 'Frozen buyer question sets are immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.guard_frozen_buyer_question_set()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  if old.is_frozen then raise exception 'Frozen buyer question sets are immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists buyer_questions_frozen_guard on public.buyer_questions;
create trigger buyer_questions_frozen_guard
before insert or update or delete on public.buyer_questions
for each row execute function public.guard_frozen_buyer_questions();

drop trigger if exists buyer_question_sets_frozen_guard on public.buyer_question_sets;
create trigger buyer_question_sets_frozen_guard
before update or delete on public.buyer_question_sets
for each row execute function public.guard_frozen_buyer_question_set();

alter table public.buyer_intent_runs enable row level security;
alter table public.buyer_question_sets enable row level security;
alter table public.buyer_questions enable row level security;

create policy "Clerk owner can read buyer intent runs" on public.buyer_intent_runs
  for select to authenticated using (exists (
    select 1 from public.projects p where p.id = buyer_intent_runs.project_id
      and p.user_id = public.current_clerk_profile_id()
  ));
create policy "Clerk owner can read buyer question sets" on public.buyer_question_sets
  for select to authenticated using (exists (
    select 1 from public.projects p where p.id = buyer_question_sets.project_id
      and p.user_id = public.current_clerk_profile_id()
  ));
create policy "Clerk owner can read buyer questions" on public.buyer_questions
  for select to authenticated using (exists (
    select 1 from public.projects p where p.id = buyer_questions.project_id
      and p.user_id = public.current_clerk_profile_id()
  ));

revoke insert, update, delete on public.buyer_intent_runs, public.buyer_question_sets,
  public.buyer_questions from anon, authenticated;
revoke execute on function public.guard_frozen_buyer_questions() from public, anon, authenticated;
revoke execute on function public.guard_frozen_buyer_question_set() from public, anon, authenticated;
