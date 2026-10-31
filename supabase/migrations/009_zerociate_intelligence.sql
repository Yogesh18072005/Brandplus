-- Zerociate Phases 3-7: structured buyer intent, evidence, actions, and experiments.

alter table public.projects
  add column if not exists products jsonb not null default '[]',
  add column if not exists services jsonb not null default '[]',
  add column if not exists locations jsonb not null default '[]',
  add column if not exists target_customers jsonb not null default '[]',
  add column if not exists markets jsonb not null default '[]';

alter table public.audit_results
  add column if not exists intent_weight numeric not null default 1,
  add column if not exists observed_at timestamptz,
  add column if not exists execution_metadata jsonb not null default '{}';

alter table public.tracking_snapshots
  add column if not exists zerociate_score int not null default 0,
  add column if not exists recommendation_rate float not null default 0,
  add column if not exists citation_rate float not null default 0,
  add column if not exists commercial_visibility float not null default 0,
  add column if not exists prompt_coverage float not null default 0;

-- Queryable frozen prompt universe. projects.prompt_set remains the canonical
-- versioned snapshot for backwards compatibility and reproducible retries.
create table if not exists public.monitored_prompts (
  id uuid primary key default extensions.uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  prompt_set_version int not null,
  prompt_text text not null,
  intent text not null,
  intent_weight numeric not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(project_id, prompt_set_version, prompt_text)
);

create index if not exists idx_monitored_prompts_project_version
  on public.monitored_prompts(project_id, prompt_set_version);
alter table public.monitored_prompts enable row level security;
create policy "Users can view own monitored prompts" on public.monitored_prompts
  for select to authenticated using (
    exists (select 1 from public.projects p where p.id = monitored_prompts.project_id and p.user_id = auth.uid())
  );
revoke insert, update, delete on public.monitored_prompts from anon, authenticated;

-- Normalized citations make source/domain analysis queryable without scanning
-- every report JSON document.
create table if not exists public.audit_citations (
  id uuid primary key default extensions.uuid_generate_v4(),
  audit_result_id uuid not null references public.audit_results(id) on delete cascade,
  audit_id uuid not null references public.audits(id) on delete cascade,
  url text not null,
  domain text not null,
  title text,
  source_type text not null default 'web',
  created_at timestamptz not null default now(),
  unique(audit_result_id, url)
);

create index if not exists idx_audit_citations_audit_domain on public.audit_citations(audit_id, domain);
alter table public.audit_citations enable row level security;
create policy "Users can view own audit citations" on public.audit_citations
  for select to authenticated using (
    exists (
      select 1 from public.audits a join public.projects p on p.id = a.project_id
      where a.id = audit_citations.audit_id and p.user_id = auth.uid()
    )
  );
revoke insert, update, delete on public.audit_citations from anon, authenticated;

create table if not exists public.action_items (
  id uuid primary key default extensions.uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  audit_id uuid references public.audits(id) on delete set null,
  title text not null,
  problem text not null,
  why_it_matters text not null,
  evidence jsonb not null default '[]',
  recommended_action text not null,
  expected_objective text not null,
  implementation_guidance text not null,
  priority text not null check (priority in ('critical', 'high', 'quick_win')),
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'implemented', 'verified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_action_items_project_status on public.action_items(project_id, status, created_at desc);
create unique index if not exists idx_action_items_audit_title on public.action_items(project_id, audit_id, title);
alter table public.action_items enable row level security;
create policy "Users can view own action items" on public.action_items
  for select to authenticated using (
    exists (select 1 from public.projects p where p.id = action_items.project_id and p.user_id = auth.uid())
  );
create policy "Users can update own action items" on public.action_items
  for update to authenticated using (
    exists (select 1 from public.projects p where p.id = action_items.project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = action_items.project_id and p.user_id = auth.uid())
  );
revoke insert, delete on public.action_items from anon, authenticated;

create table if not exists public.experiments (
  id uuid primary key default extensions.uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  change_summary text not null,
  affected_page text,
  target_cluster text,
  implemented_at date not null,
  baseline_audit_id uuid references public.audits(id) on delete set null,
  comparison_audit_id uuid references public.audits(id) on delete set null,
  status text not null default 'monitoring' check (status in ('planned', 'monitoring', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_experiments_project_created on public.experiments(project_id, created_at desc);
alter table public.experiments enable row level security;
create policy "Users can view own experiments" on public.experiments
  for select to authenticated using (
    exists (select 1 from public.projects p where p.id = experiments.project_id and p.user_id = auth.uid())
  );
create policy "Users can create own experiments" on public.experiments
  for insert to authenticated with check (
    exists (select 1 from public.projects p where p.id = experiments.project_id and p.user_id = auth.uid())
  );
create policy "Users can update own experiments" on public.experiments
  for update to authenticated using (
    exists (select 1 from public.projects p where p.id = experiments.project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = experiments.project_id and p.user_id = auth.uid())
  );
create policy "Users can delete own experiments" on public.experiments
  for delete to authenticated using (
    exists (select 1 from public.projects p where p.id = experiments.project_id and p.user_id = auth.uid())
  );

create trigger action_items_updated_at before update on public.action_items
  for each row execute function public.update_updated_at();
create trigger experiments_updated_at before update on public.experiments
  for each row execute function public.update_updated_at();
