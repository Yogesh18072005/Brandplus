-- Link generated answer-page drafts to the audit that produced their recommendations.
-- Existing manually generated drafts remain unlinked and are not retroactively assigned.
alter table public.generated_content
  add column if not exists audit_id uuid references public.audits(id) on delete cascade;

create index if not exists idx_generated_content_audit_id
  on public.generated_content(audit_id)
  where audit_id is not null;
