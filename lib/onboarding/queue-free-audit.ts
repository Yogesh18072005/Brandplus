// Queue a free public audit for a lead: guest-owned project → audit → audit_queue.
// Requires GUEST_AUDIT_USER_ID — a non-login internal profile that owns
// unclaimed projects until the lead signs up and attach-leads transfers ownership.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/types';
import { PLANS } from '@/lib/billing/plans';
import { canonicalAuditJson } from '@/lib/reports/canonical-audit-envelope';

type AdminClient = SupabaseClient<Database>;

export interface FreeAuditInput {
  businessName: string;
  website: string;
  category: string;
  city: string;
  competitors: { name: string }[];
}

const FREE_PROMPTS = PLANS.free.limits.promptsPerAudit;

export function guestAuditUserId(): string | null {
  const id = process.env.GUEST_AUDIT_USER_ID?.trim();
  return id && id.length > 0 ? id : null;
}

export async function queueFreeAuditForLead(
  admin: AdminClient,
  leadId: string,
  input: FreeAuditInput
): Promise<{ ok: true; projectId: string; auditId: string } | { ok: false; error: string }> {
  const guestUserId = guestAuditUserId();
  if (!guestUserId) {
    return { ok: false, error: 'GUEST_AUDIT_USER_ID not configured — lead saved but audit not queued' };
  }

  const competitors = (input.competitors ?? []).slice(0, 5);

  const { data: project, error: projErr } = await admin
    .from('projects')
    .insert({
      user_id: guestUserId,
      business_name: input.businessName,
      website: input.website,
      category: input.category,
      city: input.city,
      competitors: competitors as unknown as Json,
    })
    .select('id')
    .single();

  if (projErr || !project) {
    return { ok: false, error: projErr?.message ?? 'Failed to create project' };
  }

  const { data: audit, error: auditErr } = await admin
    .from('audits')
    .insert({
      project_id: project.id,
      status: 'queued',
      trigger_type: 'initial',
      prompt_count: FREE_PROMPTS,
      report_data: canonicalAuditJson(),
    })
    .select('id')
    .single();

  if (auditErr || !audit) {
    await admin.from('projects').delete().eq('id', project.id);
    return { ok: false, error: auditErr?.message ?? 'Failed to create audit' };
  }

  const { error: queueErr } = await admin.from('audit_queue').insert({
    project_id: project.id,
    audit_id: audit.id,
    priority: 0,
  });

  if (queueErr) {
    return { ok: false, error: queueErr.message };
  }

  const { error: leadErr } = await admin
    .from('leads')
    .update({ project_id: project.id, audit_id: audit.id })
    .eq('id', leadId);

  if (leadErr) {
    return { ok: false, error: leadErr.message };
  }

  return { ok: true, projectId: project.id, auditId: audit.id };
}

/** Process leads that were saved but never queued (e.g. guest user was missing). */
export async function processPendingLeadAudits(
  admin: AdminClient,
  limit = 10
): Promise<Array<{ leadId: string; ok: boolean; auditId?: string; error?: string }>> {
  const { data: leads } = await admin
    .from('leads')
    .select('id, email, input')
    .eq('status', 'new')
    .is('audit_id', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  const results: Array<{ leadId: string; ok: boolean; auditId?: string; error?: string }> = [];

  for (const lead of leads ?? []) {
    const raw = (lead.input ?? {}) as Record<string, unknown>;
    const businessName = typeof raw.businessName === 'string' ? raw.businessName.trim() : '';
    const website = typeof raw.website === 'string' ? raw.website.trim() : '';
    const category = typeof raw.category === 'string' ? raw.category.trim() : '';
    const city = typeof raw.city === 'string' ? raw.city.trim() : '';
    const competitors = Array.isArray(raw.competitors)
      ? (raw.competitors as { name: string }[]).filter((c) => c?.name)
      : [];

    if (!businessName || !website || !category || !city) {
      results.push({ leadId: lead.id, ok: false, error: 'Incomplete lead input' });
      continue;
    }

    const queued = await queueFreeAuditForLead(admin, lead.id, {
      businessName,
      website,
      category,
      city,
      competitors,
    });

    if (queued.ok) {
      results.push({ leadId: lead.id, ok: true, auditId: queued.auditId });
    } else {
      results.push({ leadId: lead.id, ok: false, error: queued.error });
    }
  }

  return results;
}
