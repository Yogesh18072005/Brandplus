-- Finalize Zerociate's Clerk-backed tenant boundary and remove retired tool data.
drop table if exists public.generated_content cascade;
drop table if exists public.schema_markups cascade;
drop table if exists public.page_analyses cascade;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.current_clerk_profile_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.profiles
  where clerk_user_id = auth.jwt()->>'sub'
  limit 1
$$;

create or replace function public.ensure_clerk_profile(p_email text, p_full_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  clerk_id text := auth.jwt()->>'sub';
  profile_id uuid;
begin
  if clerk_id is null or clerk_id = '' then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(clerk_id, 0));
  select id into profile_id from public.profiles where clerk_user_id = clerk_id;
  if profile_id is null then
    profile_id := extensions.uuid_generate_v4();
    insert into public.profiles
      (id, clerk_user_id, email, full_name, plan, credits_remaining, credits_reset_at)
    values
      (profile_id, clerk_id, nullif(trim(p_email), ''), nullif(trim(p_full_name), ''),
       'free', 1, now() + interval '30 days');
  else
    update public.profiles
    set email = coalesce(nullif(trim(p_email), ''), email),
        full_name = coalesce(nullif(trim(p_full_name), ''), full_name)
    where id = profile_id;
  end if;
  return profile_id;
end;
$$;

revoke all on function public.current_clerk_profile_id() from public, anon;
revoke all on function public.ensure_clerk_profile(text, text) from public, anon;
grant execute on function public.current_clerk_profile_id() to authenticated;
grant execute on function public.ensure_clerk_profile(text, text) to authenticated;

-- Remove every historical policy. Old auth.uid() policies cannot parse Clerk IDs.
do $$
declare policy record;
begin
  for policy in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename = any(array[
      'profiles','projects','audits','audit_results','tracking_snapshots',
      'audit_queue','payments','leads','rate_limit_buckets','operational_events',
      'scheduler_runs','monitored_prompts','audit_citations','action_items','experiments'
    ])
  loop
    execute format('drop policy if exists %I on %I.%I',
      policy.policyname, policy.schemaname, policy.tablename);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.audits enable row level security;
alter table public.audit_results enable row level security;
alter table public.tracking_snapshots enable row level security;
alter table public.audit_queue enable row level security;
alter table public.payments enable row level security;
alter table public.leads enable row level security;
alter table public.rate_limit_buckets enable row level security;
alter table public.operational_events enable row level security;
alter table public.scheduler_runs enable row level security;
alter table public.monitored_prompts enable row level security;
alter table public.audit_citations enable row level security;
alter table public.action_items enable row level security;
alter table public.experiments enable row level security;

-- Anonymous clients receive no database surface. Tenant mutations are made by
-- validated server routes; authenticated clients only receive owner-scoped reads.
revoke all on table
  public.profiles, public.projects, public.audits, public.audit_results,
  public.tracking_snapshots, public.audit_queue, public.payments, public.leads,
  public.rate_limit_buckets, public.operational_events, public.scheduler_runs,
  public.monitored_prompts, public.audit_citations, public.action_items,
  public.experiments
from anon, authenticated;

grant select on table
  public.profiles, public.projects, public.audits, public.audit_results,
  public.tracking_snapshots, public.audit_queue, public.payments,
  public.monitored_prompts, public.audit_citations, public.action_items,
  public.experiments
to authenticated;
grant update (full_name, company_name) on table public.profiles to authenticated;

create policy "Clerk owner can read profile" on public.profiles
  for select to authenticated using (clerk_user_id = auth.jwt()->>'sub');
create policy "Clerk owner can edit profile" on public.profiles
  for update to authenticated using (clerk_user_id = auth.jwt()->>'sub')
  with check (clerk_user_id = auth.jwt()->>'sub');
create policy "Clerk owner can read projects" on public.projects
  for select to authenticated using (user_id = public.current_clerk_profile_id());
create policy "Clerk owner can read audits" on public.audits
  for select to authenticated using (exists (
    select 1 from public.projects p where p.id = audits.project_id
      and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read audit results" on public.audit_results
  for select to authenticated using (exists (
    select 1 from public.audits a join public.projects p on p.id = a.project_id
    where a.id = audit_results.audit_id
      and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read snapshots" on public.tracking_snapshots
  for select to authenticated using (exists (
    select 1 from public.projects p where p.id = tracking_snapshots.project_id
      and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read queue" on public.audit_queue
  for select to authenticated using (exists (
    select 1 from public.projects p where p.id = audit_queue.project_id
      and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read payments" on public.payments
  for select to authenticated using (user_id = public.current_clerk_profile_id());
create policy "Clerk owner can read prompts" on public.monitored_prompts
  for select to authenticated using (exists (
    select 1 from public.projects p where p.id = monitored_prompts.project_id
      and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read citations" on public.audit_citations
  for select to authenticated using (exists (
    select 1 from public.audits a join public.projects p on p.id = a.project_id
    where a.id = audit_citations.audit_id
      and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read actions" on public.action_items
  for select to authenticated using (exists (
    select 1 from public.projects p where p.id = action_items.project_id
      and p.user_id = public.current_clerk_profile_id()));
create policy "Clerk owner can read experiments" on public.experiments
  for select to authenticated using (exists (
    select 1 from public.projects p where p.id = experiments.project_id
      and p.user_id = public.current_clerk_profile_id()));

-- No policies/grants are intentional for service-only leads, rate limits,
-- operational events and scheduler runs.
