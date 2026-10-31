-- Link free-audit leads to the queued audit so cron can email the requester
-- and attach-leads can transfer the guest project on first login.

alter table public.leads
  add column if not exists audit_id uuid references public.audits(id) on delete set null;

create index if not exists idx_leads_audit_id on public.leads(audit_id);
create index if not exists idx_leads_project_id on public.leads(project_id);
