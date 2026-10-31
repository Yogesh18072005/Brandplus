-- Claim a matching pre-signup audit in the same transaction that provisions or
-- refreshes a Clerk profile. This avoids relying on eventual webhook delivery.
create or replace function public.claim_profile_leads()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  available_slots integer;
  lead record;
begin
  if new.clerk_user_id is null or nullif(trim(new.email), '') is null then
    return new;
  end if;

  available_slots := case
    when new.plan = 'pro' and (new.plan_expires_at is null or new.plan_expires_at > now()) then 10
    else 1
  end - (
    select count(*)::integer from public.projects
    where user_id = new.id and status <> 'archived'
  );

  if available_slots <= 0 then return new; end if;

  for lead in
    select id, project_id, audit_id
    from public.leads
    where status = 'new'
      and lower(email) = lower(new.email)
      and project_id is not null
    order by created_at asc
    for update skip locked
  loop
    exit when available_slots <= 0;

    update public.projects
    set user_id = new.id
    where id = lead.project_id;

    if found then
      update public.leads
      set status = 'claimed', claimed_by = new.id, claimed_at = now()
      where id = lead.id;
      available_slots := available_slots - 1;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.claim_profile_leads() from public, anon, authenticated;

drop trigger if exists profiles_claim_free_audits on public.profiles;
create trigger profiles_claim_free_audits
  after insert or update of email, clerk_user_id on public.profiles
  for each row execute function public.claim_profile_leads();
