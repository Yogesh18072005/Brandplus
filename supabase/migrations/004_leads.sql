-- D1: the conversion bridge. A visitor's free-audit request (no account yet) is
-- stored as a lead keyed by email. On their first login, the lead is claimed and
-- turned into a project so they arrive with their business already set up.

create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  input jsonb not null,              -- { businessName, website, category, city, competitors[] }
  status text not null default 'new' check (status in ('new', 'claimed')),
  claimed_by uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create index if not exists idx_leads_email on public.leads(lower(email));
create index if not exists idx_leads_status on public.leads(status);

-- Only the service role touches leads (public intake + first-login claim).
alter table public.leads enable row level security;
