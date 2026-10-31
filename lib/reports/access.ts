import { isOpsUser } from '@/lib/auth/ops-access';
import { getEffectivePlan } from '@/lib/billing/effective-plan';
import type { PlanId } from '@/lib/billing/plans';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface FullReportAccessInput {
  authenticatedUserId: string | null | undefined;
  ownerUserId: string | null | undefined;
  isAdmin?: boolean;
  profile?: unknown;
}

/** Full reports require an authenticated owner or an authenticated allowlisted administrator. */
export function canViewFullReport({
  authenticatedUserId,
  ownerUserId,
  isAdmin = false,
}: FullReportAccessInput): boolean {
  return Boolean(authenticatedUserId && (isAdmin || authenticatedUserId === ownerUserId));
}

/** Sample reports remain public; customer reports unlock for their owner and allowlisted administrators. */
export async function currentUserCanViewFullReport(reportId: string): Promise<boolean> {
  if (!UUID_PATTERN.test(reportId)) return false;

  try {
    const { currentUser } = await import('@clerk/nextjs/server');
    const clerkUser = await currentUser();
    if (!clerkUser) return false;

    const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
    if (isOpsUser(email)) {
      return canViewFullReport({
        authenticatedUserId: clerkUser.id,
        ownerUserId: null,
        isAdmin: true,
      });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: audit } = await supabase
      .from('audits')
      .select('project_id')
      .eq('id', reportId)
      .maybeSingle();
    if (!audit) return false;

    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', audit.project_id)
      .eq('user_id', user.id)
      .maybeSingle();

    return canViewFullReport({ authenticatedUserId: user.id, ownerUserId: project?.user_id });
  } catch {
    return false;
  }
}
export type IntelligenceReportDepth = 'preview' | 'full';

export function intelligenceReportDepthForPlan(plan: PlanId, isAdmin = false): IntelligenceReportDepth {
  return isAdmin || plan !== 'free' ? 'full' : 'preview';
}

/** Resolve report depth on the server. Public and free users receive a teaser; paid owners and admins receive the complete chain. */
export async function currentUserIntelligenceReportDepth(projectId: string): Promise<IntelligenceReportDepth> {
  try {
    const { currentUser } = await import('@clerk/nextjs/server');
    const clerkUser = await currentUser();
    if (!clerkUser) return 'preview';
    const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
    if (isOpsUser(email)) return 'full';

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'preview';
    const { data: project } = await supabase.from('projects').select('id')
      .eq('id', projectId).eq('user_id', user.id).maybeSingle();
    if (!project) return 'preview';
    const { data: profile } = await supabase.from('profiles').select('plan,plan_expires_at')
      .eq('id', user.id).maybeSingle();
    return intelligenceReportDepthForPlan(getEffectivePlan(profile));
  } catch {
    return 'preview';
  }
}