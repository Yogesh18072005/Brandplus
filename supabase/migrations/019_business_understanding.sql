-- Engine 01: versioned, provenance-backed business understanding.
-- Additive only. Existing audit and project data remain unchanged.

create table if not exists public.business_understanding_runs (
  id uuid primary key default extensions.uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null check (status in ('PROCESSING','SUCCESS','PARTIAL_SUCCESS','NO_USABLE_EVIDENCE','FAILED')),
  website text not null,
  content_hash text not null,
  extraction_version text not null,
  prompt_version text not null,
  schema_version text not null,
  model text not null,
  source_coverage jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  failure_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, project_id),
  unique (project_id, content_hash, extraction_version)
);

create table if not exists public.business_profiles (
  id uuid primary key default extensions.uuid_generate_v4(),
  run_id uuid not null unique,
  project_id uuid not null references public.projects(id) on delete cascade,
  business_name text not null,
  website text not null,
  description text,
  description_evidence_keys jsonb not null default '[]'::jsonb,
  business_model text,
  business_model_evidence_keys jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (run_id, project_id) references public.business_understanding_runs(id, project_id) on delete cascade
);

create table if not exists public.business_source_pages (
  id uuid primary key default extensions.uuid_generate_v4(),
  run_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_url text not null,
  canonical_url text not null,
  page_title text not null default '',
  source_type text not null check (source_type in ('PRODUCT_SERVICE','INDUSTRY_USE_CASE','CERTIFICATION_QUALITY','ABOUT_COMPANY','CASE_STUDY','CONTACT_LOCATION','BLOG_EDITORIAL','GENERIC_PAGE','USER_PROVIDED')),
  crawl_status text not null check (crawl_status in ('SUCCESS','EMPTY','BLOCKED','PARTIAL','MALFORMED','DUPLICATE','INACCESSIBLE')),
  content_hash text,
  http_status integer,
  fetched_at timestamptz not null,
  warning text,
  unique (run_id, canonical_url),
  foreign key (run_id, project_id) references public.business_understanding_runs(id, project_id) on delete cascade
);

create table if not exists public.business_evidence (
  id uuid primary key default extensions.uuid_generate_v4(),
  run_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_page_id uuid references public.business_source_pages(id) on delete restrict,
  evidence_key text not null,
  evidence_text text not null,
  confidence text not null check (confidence in ('HIGH','MEDIUM','LOW','UNKNOWN')),
  extracted_at timestamptz not null,
  unique (run_id, evidence_key),
  foreign key (run_id, project_id) references public.business_understanding_runs(id, project_id) on delete cascade
);

create table if not exists public.business_entities (
  id uuid primary key default extensions.uuid_generate_v4(),
  run_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  entity_key text not null,
  entity_type text not null check (entity_type in ('COMPANY_IDENTITY','PRODUCT','SERVICE','CAPABILITY','BUYER_TYPE','INDUSTRY','USE_CASE','GEOGRAPHY','COMMERCIAL_CLAIM','DIFFERENTIATOR','PROOF_ASSET','CERTIFICATION','BUSINESS_MODEL_SIGNAL','CONVERSION_SIGNAL')),
  value text not null,
  normalized_value text not null,
  description text,
  category text,
  statement_kind text not null check (statement_kind in ('FACT','INTERPRETATION','COMMERCIAL_CLAIM')),
  confidence text not null check (confidence in ('HIGH','MEDIUM','LOW')),
  unique (run_id, entity_type, normalized_value),
  foreign key (run_id, project_id) references public.business_understanding_runs(id, project_id) on delete cascade
);

create table if not exists public.business_entity_evidence (
  entity_id uuid not null references public.business_entities(id) on delete cascade,
  evidence_id uuid not null references public.business_evidence(id) on delete cascade,
  primary key (entity_id, evidence_id)
);

create table if not exists public.business_conflicts (
  id uuid primary key default extensions.uuid_generate_v4(),
  run_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  conflict_key text not null,
  topic text not null,
  conflicting_values jsonb not null,
  resolution text not null default 'UNRESOLVED' check (resolution = 'UNRESOLVED'),
  unique (run_id, conflict_key),
  foreign key (run_id, project_id) references public.business_understanding_runs(id, project_id) on delete cascade
);

create table if not exists public.business_conflict_evidence (
  conflict_id uuid not null references public.business_conflicts(id) on delete cascade,
  evidence_id uuid not null references public.business_evidence(id) on delete cascade,
  primary key (conflict_id, evidence_id)
);

create table if not exists public.business_unknowns (
  id uuid primary key default extensions.uuid_generate_v4(),
  run_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  unknown_key text not null,
  area text not null,
  reason text not null check (reason in ('NOT_EVIDENCED','CRAWL_FAILURE','AMBIGUOUS','CONFLICT')),
  detail text not null,
  evidence_keys jsonb not null default '[]'::jsonb,
  unique (run_id, unknown_key),
  foreign key (run_id, project_id) references public.business_understanding_runs(id, project_id) on delete cascade
);

create index if not exists idx_business_understanding_runs_project_created on public.business_understanding_runs(project_id, created_at desc);
create index if not exists idx_business_source_pages_run on public.business_source_pages(run_id);
create index if not exists idx_business_evidence_run on public.business_evidence(run_id);
create index if not exists idx_business_entities_run_type on public.business_entities(run_id, entity_type);

alter table public.business_understanding_runs enable row level security;
alter table public.business_profiles enable row level security;
alter table public.business_source_pages enable row level security;
alter table public.business_evidence enable row level security;
alter table public.business_entities enable row level security;
alter table public.business_entity_evidence enable row level security;
alter table public.business_conflicts enable row level security;
alter table public.business_conflict_evidence enable row level security;
alter table public.business_unknowns enable row level security;

create policy "Clerk owner can read business understanding runs" on public.business_understanding_runs
  for select to authenticated using (exists (select 1 from public.projects p where p.id = business_understanding_runs.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read business profiles" on public.business_profiles
  for select to authenticated using (exists (select 1 from public.projects p where p.id = business_profiles.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read business source pages" on public.business_source_pages
  for select to authenticated using (exists (select 1 from public.projects p where p.id = business_source_pages.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read business evidence" on public.business_evidence
  for select to authenticated using (exists (select 1 from public.projects p where p.id = business_evidence.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read business entities" on public.business_entities
  for select to authenticated using (exists (select 1 from public.projects p where p.id = business_entities.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read entity evidence" on public.business_entity_evidence
  for select to authenticated using (exists (select 1 from public.business_entities e join public.projects p on p.id = e.project_id where e.id = business_entity_evidence.entity_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read business conflicts" on public.business_conflicts
  for select to authenticated using (exists (select 1 from public.projects p where p.id = business_conflicts.project_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read conflict evidence" on public.business_conflict_evidence
  for select to authenticated using (exists (select 1 from public.business_conflicts c join public.projects p on p.id = c.project_id where c.id = business_conflict_evidence.conflict_id and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read business unknowns" on public.business_unknowns
  for select to authenticated using (exists (select 1 from public.projects p where p.id = business_unknowns.project_id and p.user_id = public.current_clerk_profile_id()));

revoke insert, update, delete on public.business_understanding_runs, public.business_profiles,
  public.business_source_pages, public.business_evidence, public.business_entities,
  public.business_entity_evidence, public.business_conflicts, public.business_conflict_evidence,
  public.business_unknowns from anon, authenticated;
