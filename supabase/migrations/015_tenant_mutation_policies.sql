-- Permit only the narrow mutations currently performed with the Clerk-scoped
-- Supabase client. Ownership is enforced again in WITH CHECK so user_id and
-- project_id cannot be changed to cross a tenant boundary.

grant update (
  business_name, website, category, city, competitors, aliases, products,
  services, locations, target_customers, markets, status
) on table public.projects to authenticated;
grant delete on table public.projects to authenticated;

create policy "Clerk owner can edit projects" on public.projects
  for update to authenticated
  using (user_id = public.current_clerk_profile_id())
  with check (user_id = public.current_clerk_profile_id());
create policy "Clerk owner can delete projects" on public.projects
  for delete to authenticated
  using (user_id = public.current_clerk_profile_id());

grant insert (
  user_id, plan_id, amount_paise, currency, razorpay_order_id,
  razorpay_payment_id, status, credits_granted, paid_at
) on table public.payments to authenticated;
create policy "Clerk owner can create pending payments" on public.payments
  for insert to authenticated
  with check (
    user_id = public.current_clerk_profile_id()
    and status = 'created'
    and razorpay_payment_id is null
    and paid_at is null
  );

grant update (status) on table public.action_items to authenticated;
create policy "Clerk owner can update action status" on public.action_items
  for update to authenticated
  using (exists (
    select 1 from public.projects p where p.id = action_items.project_id
      and p.user_id = public.current_clerk_profile_id()
  ))
  with check (exists (
    select 1 from public.projects p where p.id = action_items.project_id
      and p.user_id = public.current_clerk_profile_id()
  ));

grant insert (
  project_id, title, change_summary, affected_page, target_cluster,
  implemented_at, baseline_audit_id, comparison_audit_id, status
) on table public.experiments to authenticated;
grant update (
  title, change_summary, affected_page, target_cluster, implemented_at,
  baseline_audit_id, comparison_audit_id, status
) on table public.experiments to authenticated;
grant delete on table public.experiments to authenticated;

create policy "Clerk owner can create experiments" on public.experiments
  for insert to authenticated
  with check (exists (
    select 1 from public.projects p where p.id = experiments.project_id
      and p.user_id = public.current_clerk_profile_id()
  ));
create policy "Clerk owner can edit experiments" on public.experiments
  for update to authenticated
  using (exists (
    select 1 from public.projects p where p.id = experiments.project_id
      and p.user_id = public.current_clerk_profile_id()
  ))
  with check (exists (
    select 1 from public.projects p where p.id = experiments.project_id
      and p.user_id = public.current_clerk_profile_id()
  ));
create policy "Clerk owner can delete experiments" on public.experiments
  for delete to authenticated
  using (exists (
    select 1 from public.projects p where p.id = experiments.project_id
      and p.user_id = public.current_clerk_profile_id()
  ));
