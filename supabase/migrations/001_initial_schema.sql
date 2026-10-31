-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro')),
  credits_remaining int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Projects
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null,
  website text not null,
  category text not null,
  city text not null,
  competitors jsonb not null default '[]',
  aliases jsonb not null default '[]',
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Audits
create table public.audits (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  trigger_type text not null default 'manual' check (trigger_type in ('manual', 'scheduled', 'initial')),
  report_data jsonb,
  prompt_count int not null default 0,
  cost_estimate_cents float not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Audit Results (individual prompt results)
create table public.audit_results (
  id uuid primary key default uuid_generate_v4(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  prompt_text text not null,
  intent text not null,
  engine text not null default 'gemini',
  answer_text text not null default '',
  citations jsonb not null default '[]',
  parsed jsonb,
  grounded boolean,
  error text,
  created_at timestamptz not null default now()
);

-- Generated Content
create table public.generated_content (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  content_type text not null check (content_type in ('blog_post', 'faq_page', 'comparison', 'answer_page')),
  title text not null,
  body text not null default '',
  meta_description text,
  schema_markup jsonb,
  keywords jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Schema Markups
create table public.schema_markups (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  page_url text,
  schema_type text not null,
  json_ld jsonb not null,
  created_at timestamptz not null default now()
);

-- Page Analyses
create table public.page_analyses (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  page_url text not null,
  scores jsonb not null default '{}',
  recommendations jsonb not null default '[]',
  overall_score int not null default 0,
  created_at timestamptz not null default now()
);

-- Tracking Snapshots
create table public.tracking_snapshots (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  audit_id uuid references public.audits(id) on delete set null,
  snapshot_date date not null default current_date,
  visibility_score int not null default 0,
  presence_rate float not null default 0,
  share_of_voice float not null default 0,
  competitor_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Audit Queue
create table public.audit_queue (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  audit_id uuid references public.audits(id) on delete cascade,
  priority int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed', 'retry_later')),
  attempts int not null default 0,
  max_attempts int not null default 3,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Indexes
create index idx_projects_user_id on public.projects(user_id);
create index idx_audits_project_id on public.audits(project_id);
create index idx_audits_status on public.audits(status);
create index idx_audit_results_audit_id on public.audit_results(audit_id);
create index idx_generated_content_project_id on public.generated_content(project_id);
create index idx_schema_markups_project_id on public.schema_markups(project_id);
create index idx_page_analyses_project_id on public.page_analyses(project_id);
create index idx_tracking_snapshots_project_id on public.tracking_snapshots(project_id);
create index idx_tracking_snapshots_date on public.tracking_snapshots(snapshot_date);
create index idx_audit_queue_status on public.audit_queue(status);
create index idx_audit_queue_priority on public.audit_queue(priority desc, created_at asc);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.audits enable row level security;
alter table public.audit_results enable row level security;
alter table public.generated_content enable row level security;
alter table public.schema_markups enable row level security;
alter table public.page_analyses enable row level security;
alter table public.tracking_snapshots enable row level security;
alter table public.audit_queue enable row level security;

-- Profiles: users can read/update only their own profile
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Projects: users can CRUD only their own projects
create policy "Users can view own projects" on public.projects for select using (auth.uid() = user_id);
create policy "Users can create projects" on public.projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on public.projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on public.projects for delete using (auth.uid() = user_id);

-- Audits: users can view/create audits for their own projects
create policy "Users can view own audits" on public.audits for select using (
  project_id in (select id from public.projects where user_id = auth.uid())
);
create policy "Users can create audits" on public.audits for insert with check (
  project_id in (select id from public.projects where user_id = auth.uid())
);

-- Audit Results: users can view results for their audits
create policy "Users can view own audit results" on public.audit_results for select using (
  audit_id in (
    select a.id from public.audits a
    join public.projects p on a.project_id = p.id
    where p.user_id = auth.uid()
  )
);

-- Generated Content: users CRUD own
create policy "Users can view own content" on public.generated_content for select using (
  project_id in (select id from public.projects where user_id = auth.uid())
);
create policy "Users can create content" on public.generated_content for insert with check (
  project_id in (select id from public.projects where user_id = auth.uid())
);
create policy "Users can update own content" on public.generated_content for update using (
  project_id in (select id from public.projects where user_id = auth.uid())
);
create policy "Users can delete own content" on public.generated_content for delete using (
  project_id in (select id from public.projects where user_id = auth.uid())
);

-- Schema Markups
create policy "Users can view own schemas" on public.schema_markups for select using (
  project_id in (select id from public.projects where user_id = auth.uid())
);
create policy "Users can create schemas" on public.schema_markups for insert with check (
  project_id in (select id from public.projects where user_id = auth.uid())
);
create policy "Users can delete own schemas" on public.schema_markups for delete using (
  project_id in (select id from public.projects where user_id = auth.uid())
);

-- Page Analyses
create policy "Users can view own analyses" on public.page_analyses for select using (
  project_id in (select id from public.projects where user_id = auth.uid())
);
create policy "Users can create analyses" on public.page_analyses for insert with check (
  project_id in (select id from public.projects where user_id = auth.uid())
);

-- Tracking Snapshots
create policy "Users can view own snapshots" on public.tracking_snapshots for select using (
  project_id in (select id from public.projects where user_id = auth.uid())
);

-- Audit Queue
create policy "Users can view own queue" on public.audit_queue for select using (
  project_id in (select id from public.projects where user_id = auth.uid())
);
create policy "Users can create queue items" on public.audit_queue for insert with check (
  project_id in (select id from public.projects where user_id = auth.uid())
);

-- Service role policies for cron/webhooks (bypasses RLS when using service_role key)
-- No additional policies needed; service_role key bypasses RLS by default.

-- Trigger: auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute function public.update_updated_at();
create trigger generated_content_updated_at before update on public.generated_content
  for each row execute function public.update_updated_at();

-- Public read policy for audits accessed via share link (report page /r/[id])
create policy "Anyone can view audits by id for public reports" on public.audits
  for select using (status = 'completed');
create policy "Anyone can view results for completed audits" on public.audit_results
  for select using (
    audit_id in (select id from public.audits where status = 'completed')
  );
