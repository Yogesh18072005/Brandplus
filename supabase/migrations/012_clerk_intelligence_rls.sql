-- Complete the Clerk identity migration for Zerociate intelligence tables.
-- Old policies called auth.uid(), which assumes a UUID `sub`; Clerk user IDs
-- are strings. Ownership is resolved through profiles.clerk_user_id instead.

drop policy if exists "Users can view own monitored prompts" on public.monitored_prompts;
drop policy if exists "Users can view own audit citations" on public.audit_citations;
drop policy if exists "Users can view own action items" on public.action_items;
drop policy if exists "Users can update own action items" on public.action_items;
drop policy if exists "Users can view own experiments" on public.experiments;
drop policy if exists "Users can create own experiments" on public.experiments;
drop policy if exists "Users can update own experiments" on public.experiments;
drop policy if exists "Users can delete own experiments" on public.experiments;

create policy "Clerk users can view own monitored prompts" on public.monitored_prompts
  for select to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = monitored_prompts.project_id
        and p.user_id = public.current_clerk_profile_id()
    )
  );

create policy "Clerk users can view own audit citations" on public.audit_citations
  for select to authenticated using (
    exists (
      select 1 from public.audits a
      join public.projects p on p.id = a.project_id
      where a.id = audit_citations.audit_id
        and p.user_id = public.current_clerk_profile_id()
    )
  );

create policy "Clerk users can view own action items" on public.action_items
  for select to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = action_items.project_id
        and p.user_id = public.current_clerk_profile_id()
    )
  );

create policy "Clerk users can update own action items" on public.action_items
  for update to authenticated using (
    exists (
      select 1 from public.projects p
      where p.id = action_items.project_id
        and p.user_id = public.current_clerk_profile_id()
    )
  ) with check (
    exists (
      select 1 from public.projects p
      where p.id = action_items.project_id
        and p.user_id = public.current_clerk_profile_id()
    )
  );

create policy "Clerk users can view own experiments" on public.experiments
  for select to authenticated using (
    exists (select 1 from public.projects p where p.id = experiments.project_id and p.user_id = public.current_clerk_profile_id())
  );
create policy "Clerk users can create own experiments" on public.experiments
  for insert to authenticated with check (
    exists (select 1 from public.projects p where p.id = experiments.project_id and p.user_id = public.current_clerk_profile_id())
  );
create policy "Clerk users can update own experiments" on public.experiments
  for update to authenticated using (
    exists (select 1 from public.projects p where p.id = experiments.project_id and p.user_id = public.current_clerk_profile_id())
  ) with check (
    exists (select 1 from public.projects p where p.id = experiments.project_id and p.user_id = public.current_clerk_profile_id())
  );
create policy "Clerk users can delete own experiments" on public.experiments
  for delete to authenticated using (
    exists (select 1 from public.projects p where p.id = experiments.project_id and p.user_id = public.current_clerk_profile_id())
  );
