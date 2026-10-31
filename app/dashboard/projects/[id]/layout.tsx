import type { ReactNode } from 'react';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { IntelligenceTabs } from '@/components/dashboard/project/IntelligenceTabs';
import { ErrorNote } from '@/components/dashboard/project/kit';
import { isOpsUser } from '@/lib/auth/ops-access';
import { ClientRouteGuard } from '@/components/dashboard/project/ClientRouteGuard';

/**
 * The business header renders on the server with the page shell, so switching
 * tabs never waits on a separate client fetch just to show the business name.
 */
export default async function ProjectWorkspaceLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: project } = user
    ? await supabase
      .from('projects')
      .select('business_name, website, category, city')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    : { data: null };

  const meta = [project?.category, project?.city].filter(Boolean).join(' · ');

  return (
    <div className="project-workspace">
      <Link href="/dashboard/projects" className="project-back-link">← All businesses</Link>
      <header className="project-workspace-header">
        {!project ? <ErrorNote message="Business not found" /> : (
          <div>
            <h1>{project.business_name}</h1>
            <p>{meta ? `${meta} · ` : ''}{project.website}</p>
          </div>
        )}
      </header>
      {/* Clients get one simple report page; the engine tabs are founder tooling. */}
      {isOpsUser(user?.email) ? <IntelligenceTabs projectId={id} /> : <ClientRouteGuard projectId={id} />}
      <div className="project-workspace-content">{children}</div>
    </div>
  );
}
