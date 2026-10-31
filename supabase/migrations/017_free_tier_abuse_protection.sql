-- Free-tier abuse protection. Raw IP/email values never reach Postgres: the
-- application sends scoped HMAC-SHA256 hashes produced with RATE_LIMIT_SALT.

alter table public.profiles
  add column if not exists free_credit_status text;

-- Preserve entitlements for profiles created before this policy shipped.
update public.profiles
set free_credit_status = 'granted'
where free_credit_status is null;

alter table public.profiles
  alter column free_credit_status set default 'pending',
  alter column free_credit_status set not null,
  alter column credits_remaining set default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_free_credit_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_free_credit_status_check
      check (free_credit_status in ('pending', 'granted', 'blocked'));
  end if;
end $$;

create table if not exists public.free_signup_credit_claims (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  network_hash text,
  granted boolean not null,
  created_at timestamptz not null default now(),
  check (network_hash is null or network_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists free_signup_credit_claims_network_idx
  on public.free_signup_credit_claims(network_hash)
  where granted;

create table if not exists public.free_audit_claims (
  email_hash text primary key,
  network_hash text not null,
  created_at timestamptz not null default now(),
  check (email_hash ~ '^[a-f0-9]{64}$'),
  check (network_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists free_audit_claims_network_idx
  on public.free_audit_claims(network_hash);

alter table public.free_signup_credit_claims enable row level security;
alter table public.free_audit_claims enable row level security;
revoke all on table public.free_signup_credit_claims, public.free_audit_claims
  from public, anon, authenticated;

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
      (id, clerk_user_id, email, full_name, plan, credits_remaining,
       credits_reset_at, free_credit_status)
    values
      (profile_id, clerk_id, nullif(trim(p_email), ''), nullif(trim(p_full_name), ''),
       'free', 0, null, 'pending');
  else
    update public.profiles
    set email = coalesce(nullif(trim(p_email), ''), email),
        full_name = coalesce(nullif(trim(p_full_name), ''), full_name)
    where id = profile_id;
  end if;
  return profile_id;
end;
$$;

revoke all on function public.ensure_clerk_profile(text, text) from public, anon;
grant execute on function public.ensure_clerk_profile(text, text) to authenticated;

-- At most two free entitlements total per hashed network, shared with public audits.
-- The advisory lock makes the count-and-insert decision safe under concurrency.
create or replace function public.claim_free_signup_credit(
  p_profile_id uuid,
  p_network_hash text
)
returns table (allowed boolean, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  claim_allowed boolean := false;
  claim_status text := 'blocked';
  prior_grant boolean;
  granted_count integer;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'claim_free_signup_credit requires service_role' using errcode = '42501';
  end if;

  select granted into prior_grant
  from public.free_signup_credit_claims
  where profile_id = p_profile_id;

  if found then
    claim_allowed := prior_grant;
    claim_status := case when prior_grant then 'granted' else 'blocked' end;
    return query select claim_allowed, claim_status;
    return;
  end if;

  if p_network_hash ~ '^[a-f0-9]{64}$' then
    perform pg_advisory_xact_lock(hashtextextended(p_network_hash, 0));
    select (
      (select count(*) from public.free_signup_credit_claims
       where network_hash = p_network_hash and granted)
      +
      (select count(*) from public.free_audit_claims
       where network_hash = p_network_hash)
    )::integer into granted_count;
    claim_allowed := granted_count < 2;
  end if;

  claim_status := case when claim_allowed then 'granted' else 'blocked' end;
  insert into public.free_signup_credit_claims(profile_id, network_hash, granted)
  values (
    p_profile_id,
    case when p_network_hash ~ '^[a-f0-9]{64}$' then p_network_hash else null end,
    claim_allowed
  );

  update public.profiles
  set free_credit_status = claim_status,
      credits_remaining = case
        when plan = 'free' and claim_allowed then greatest(credits_remaining, 1)
        when plan = 'free' then 0
        else credits_remaining
      end,
      credits_reset_at = case when plan = 'free' then null else credits_reset_at end
  where id = p_profile_id;

  return query select claim_allowed, claim_status;
end;
$$;

revoke all on function public.claim_free_signup_credit(uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_free_signup_credit(uuid, text) to service_role;

-- Public lead audits get a separate lifetime limit: one per email and no more
-- than two per hashed network. This closes the no-account email-rotation path.
create or replace function public.claim_free_public_audit(
  p_network_hash text,
  p_email_hash text
)
returns table (allowed boolean, reason text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_count integer;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'claim_free_public_audit requires service_role' using errcode = '42501';
  end if;
  if p_network_hash !~ '^[a-f0-9]{64}$' or p_email_hash !~ '^[a-f0-9]{64}$' then
    return query select false, 'identity_unavailable'::text;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_network_hash, 0));
  if exists (select 1 from public.free_audit_claims where email_hash = p_email_hash) then
    return query select false, 'email_used'::text;
    return;
  end if;

  select (
    (select count(*) from public.free_audit_claims
     where network_hash = p_network_hash)
    +
    (select count(*) from public.free_signup_credit_claims
     where network_hash = p_network_hash and granted)
  )::integer into claimed_count;
  if claimed_count >= 2 then
    return query select false, 'network_limit'::text;
    return;
  end if;

  insert into public.free_audit_claims(email_hash, network_hash)
  values (p_email_hash, p_network_hash);
  return query select true, 'granted'::text;
end;
$$;

revoke all on function public.claim_free_public_audit(text, text)
  from public, anon, authenticated;
grant execute on function public.claim_free_public_audit(text, text) to service_role;

-- Free credits are one-time. Paid monthly credits still reset every 30 days,
-- and purchased top-up credits continue to work on free profiles.
create or replace function public.reserve_audit_credit(p_user_id uuid)
returns table (ok boolean, remaining integer, plan text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_row public.profiles%rowtype;
  effective_plan text;
  available integer;
  reset_at timestamptz;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'reserve_audit_credit requires service_role' using errcode = '42501';
  end if;
  select p.* into profile_row from public.profiles p where p.id = p_user_id for update;
  if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;

  effective_plan := case
    when profile_row.plan in ('starter', 'pro')
      and (profile_row.plan_expires_at is null or profile_row.plan_expires_at > now())
      then profile_row.plan
    else 'free'
  end;

  if effective_plan = 'free' then
    available := greatest(profile_row.credits_remaining, 0);
    reset_at := null;
  elsif profile_row.credits_reset_at is null or profile_row.credits_reset_at <= now() then
    available := case effective_plan when 'pro' then 6 else 2 end;
    reset_at := now() + interval '30 days';
  else
    available := greatest(profile_row.credits_remaining, 0);
    reset_at := profile_row.credits_reset_at;
  end if;

  if available <= 0 then
    update public.profiles set credits_remaining = 0, credits_reset_at = reset_at
    where id = p_user_id;
    return query select false, 0, effective_plan;
    return;
  end if;

  available := available - 1;
  update public.profiles
  set credits_remaining = available, credits_reset_at = reset_at
  where id = p_user_id;
  return query select true, available, effective_plan;
end;
$$;

revoke all on function public.reserve_audit_credit(uuid) from public, anon, authenticated;
grant execute on function public.reserve_audit_credit(uuid) to service_role;
