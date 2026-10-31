// D1 conversion bridge: when a user logs in for the first time, claim any
// free-audit leads that match their email and turn the first one into a project
// (so they arrive with their business already set up). Idempotent and
// best-effort — never throws into the auth flow.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/types';
import { getPlanLimits } from '@/lib/billing/plans';
import { getEffectivePlan } from '@/lib/billing/effective-plan';

type DB = SupabaseClient<Database>;

interface LeadInput {
  businessName?: string;
  website?: string;
  category?: string;
  city?: string;
  competitors?: { name: string }[];
}

export async function attachLeadsForUser(
  supabase: DB,
  userId: string,
  email: string | null | undefined
): Promise<{ attached: number; projectId?: string }> {
  if (!email) return { attached: 0 };

  const { data: leads } = await supabase
    .from('leads')
    .select('id, input, project_id, audit_id')
    .eq('status', 'new')
    .ilike('email', email)
    .order('created_at', { ascending: true });

  if (!leads || leads.length === 0) return { attached: 0 };

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', userId)
    .single();
  const limits = getPlanLimits(getEffectivePlan(profile));

  const { count: existing } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .neq('status', 'archived');

  let created = 0;
  let firstProjectId: string | undefined;
  let slots = Math.max(0, limits.maxProjects - (existing ?? 0));

  for (const lead of leads) {
    // Guest audit already created a project — transfer ownership instead of duplicating.
    if (lead.project_id && slots > 0) {
      const { error } = await supabase
        .from('projects')
        .update({ user_id: userId })
        .eq('id', lead.project_id);

      if (!error) {
        firstProjectId ??= lead.project_id;
        created++;
        slots--;
        await supabase
          .from('leads')
          .update({
            status: 'claimed',
            claimed_by: userId,
            project_id: lead.project_id,
            audit_id: lead.audit_id,
            claimed_at: new Date().toISOString(),
          })
          .eq('id', lead.id);
        continue;
      }
    }

    const input = (lead.input ?? {}) as LeadInput;
    if (slots > 0 && input.businessName && input.website && input.category && input.city) {
      const competitors = Array.isArray(input.competitors) ? input.competitors.slice(0, 5) : [];
      const { data: project } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          business_name: input.businessName,
          website: input.website,
          category: input.category,
          city: input.city,
          competitors: competitors as unknown as Json,
        })
        .select('id')
        .single();

      if (project) {
        firstProjectId ??= project.id;
        created++;
        slots--;
        await supabase
          .from('leads')
          .update({
            status: 'claimed',
            claimed_by: userId,
            project_id: project.id,
            audit_id: lead.audit_id,
            claimed_at: new Date().toISOString(),
          })
          .eq('id', lead.id);
        continue;
      }
    }

    await supabase
      .from('leads')
      .update({ status: 'claimed', claimed_by: userId, claimed_at: new Date().toISOString() })
      .eq('id', lead.id);
  }

  return { attached: created, projectId: firstProjectId };
}
