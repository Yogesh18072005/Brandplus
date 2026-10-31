-- E0.1: freeze the buyer-question set per project so re-audits are comparable.
--
-- prompt_set: the canonical { text, intent }[] used for EVERY audit of this
-- project. Generated once on the first audit, reused verbatim thereafter.
-- prompt_set_version: 0 = never frozen; bumped to 1 on first freeze, and +1 on
-- each explicit owner-triggered refresh. E1 treats a version change as a
-- baseline reset (no fake before/after delta across different question sets).
alter table public.projects
  add column if not exists prompt_set jsonb,
  add column if not exists prompt_set_version int not null default 0;
