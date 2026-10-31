-- Clerk becomes the source of authentication while Supabase remains the
-- application database. Profiles keep stable UUIDs so every existing project,
-- audit, payment and credit relationship remains intact.

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  add column if not exists clerk_user_id text,
  add column if not exists email text;

create unique index if not exists profiles_clerk_user_id_key
  on public.profiles (clerk_user_id)
  where clerk_user_id is not null;

create index if not exists profiles_email_idx
  on public.profiles (lower(email))
  where email is not null;

comment on column public.profiles.clerk_user_id is
  'The Clerk user ID. Clerk authenticates; profile UUIDs remain internal ownership keys.';

create or replace function public.current_clerk_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.profiles
  where clerk_user_id = auth.jwt()->>'sub'
  limit 1
$$;

create or replace function public.ensure_clerk_profile(p_email text, p_full_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  clerk_id text := auth.jwt()->>'sub';
  profile_id uuid;
begin
  if clerk_id is null or clerk_id = '' then
    raise exception 'Authentication required';
  end if;

  select id into profile_id from public.profiles where clerk_user_id = clerk_id;
  if profile_id is null then
    profile_id := extensions.uuid_generate_v4();
    insert into public.profiles (
      id, clerk_user_id, email, full_name, plan, credits_remaining, credits_reset_at
    ) values (
      profile_id, clerk_id, nullif(trim(p_email), ''), nullif(trim(p_full_name), ''),
      'free', 1, now() + interval '30 days'
    );
  else
    update public.profiles
      set email = coalesce(nullif(trim(p_email), ''), email),
          full_name = coalesce(nullif(trim(p_full_name), ''), full_name)
      where id = profile_id;
  end if;
  return profile_id;
end;
$$;

grant execute on function public.ensure_clerk_profile(text, text) to authenticated;
grant execute on function public.current_clerk_profile_id() to authenticated;

create policy "Clerk users can view own profile" on public.profiles
  for select using (clerk_user_id = auth.jwt()->>'sub');
create policy "Clerk users can update own profile" on public.profiles
  for update using (clerk_user_id = auth.jwt()->>'sub')
  with check (clerk_user_id = auth.jwt()->>'sub');

create policy "Clerk users can view own projects" on public.projects
  for select using (user_id = public.current_clerk_profile_id());
create policy "Clerk users can create own projects" on public.projects
  for insert with check (user_id = public.current_clerk_profile_id());
create policy "Clerk users can update own projects" on public.projects
  for update using (user_id = public.current_clerk_profile_id());
create policy "Clerk users can delete own projects" on public.projects
  for delete using (user_id = public.current_clerk_profile_id());

create policy "Clerk users can view own audits" on public.audits
  for select using (project_id in (select id from public.projects where user_id = public.current_clerk_profile_id()));
create policy "Clerk users can create own audits" on public.audits
  for insert with check (project_id in (select id from public.projects where user_id = public.current_clerk_profile_id()));

create policy "Clerk users can view own audit results" on public.audit_results
  for select using (audit_id in (
    select a.id from public.audits a join public.projects p on p.id = a.project_id
    where p.user_id = public.current_clerk_profile_id()
  ));

create policy "Clerk users can view own queue" on public.audit_queue
  for select using (project_id in (select id from public.projects where user_id = public.current_clerk_profile_id()));
create policy "Clerk users can create own queue items" on public.audit_queue
  for insert with check (project_id in (select id from public.projects where user_id = public.current_clerk_profile_id()));

create policy "Clerk users can view own payments" on public.payments
  for select using (user_id = public.current_clerk_profile_id());
create policy "Clerk users can create own pending payments" on public.payments
  for insert with check (user_id = public.current_clerk_profile_id() and status = 'created');

create policy "Clerk users can view own content" on public.generated_content
  for select using (project_id in (select id from public.projects where user_id = public.current_clerk_profile_id()));
create policy "Clerk users can create own content" on public.generated_content
  for insert with check (project_id in (select id from public.projects where user_id = public.current_clerk_profile_id()));
create policy "Clerk users can update own content" on public.generated_content
  for update using (project_id in (select id from public.projects where user_id = public.current_clerk_profile_id()));
create policy "Clerk users can delete own content" on public.generated_content
  for delete using (project_id in (select id from public.projects where user_id = public.current_clerk_profile_id()));

create policy "Clerk users can view own schemas" on public.schema_markups
  for select using (project_id in (select id from public.projects where user_id = public.current_clerk_profile_id()));
create policy "Clerk users can create own schemas" on public.schema_markups
  for insert with check (project_id in (select id from public.projects where user_id = public.current_clerk_profile_id()));
create policy "Clerk users can delete own schemas" on public.schema_markups
  for delete using (project_id in (select id from public.projects where user_id = public.current_clerk_profile_id()));

create policy "Clerk users can view own analyses" on public.page_analyses
  for select using (project_id in (select id from public.projects where user_id = public.current_clerk_profile_id()));
create policy "Clerk users can create own analyses" on public.page_analyses
  for insert with check (project_id in (select id from public.projects where user_id = public.current_clerk_profile_id()));

create policy "Clerk users can view own snapshots" on public.tracking_snapshots
  for select using (project_id in (select id from public.projects where user_id = public.current_clerk_profile_id()));
