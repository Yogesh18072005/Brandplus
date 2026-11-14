-- Restore the draft storage used by the opt-in report content generator.
-- Tenant ownership is enforced by project-scoped RLS; writes are performed
-- only by the authenticated server route after it verifies project ownership.

create table if not exists public.generated_content (
  id uuid primary key default extensions.uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  content_type text not null check (content_type in ('blog_post', 'faq_page', 'comparison', 'answer_page')),
  title text not null,
  body text not null default '',
  meta_description text,
  schema_markup jsonb,
  keywords jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_generated_content_project_id
  on public.generated_content(project_id);

alter table public.generated_content enable row level security;

revoke all on table public.generated_content from anon, authenticated;
grant select on table public.generated_content to authenticated;

drop policy if exists "Clerk owner can read generated content" on public.generated_content;
create policy "Clerk owner can read generated content"
  on public.generated_content
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = generated_content.project_id
        and p.user_id = public.current_clerk_profile_id()
    )
  );

drop trigger if exists generated_content_updated_at on public.generated_content;
create trigger generated_content_updated_at
  before update on public.generated_content
  for each row execute function public.update_updated_at();
