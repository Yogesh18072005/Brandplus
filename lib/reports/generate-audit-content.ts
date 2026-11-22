// Automatically creates one Gemini batch of answer-page drafts for a completed audit.
// Draft generation is deliberately best-effort: it must never turn a completed audit into a failed audit.
import { generateContentBatch } from '@/lib/tools/content-writer';
import { recordOperationalEvent } from '@/lib/ops/events';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/types';

type AdminClient = SupabaseClient<Database>;

export async function generateAuditContentDrafts(
  client: AdminClient,
  input: {
    auditId: string;
    projectId: string;
    topics: string[];
    evidence?: { question: string; answerQuote: string | null; competitorsNamed: string[] }[];
  },
): Promise<void> {
  const topics = [...new Set(input.topics.map((topic) => topic.trim()).filter(Boolean))].slice(0, 5);
  if (!topics.length) return;

  try {
    // A saved set for this audit means the batch already ran. This also makes
    // queue recovery and repeated completion callbacks safe from extra Gemini calls.
    const { data: existing, error: existingError } = await client
      .from('generated_content')
      .select('id')
      .eq('audit_id', input.auditId)
      .eq('content_type', 'answer_page')
      .limit(5);
    if (existingError) throw new Error(`Could not check existing audit drafts: ${existingError.message}`);
    if ((existing ?? []).length > 0) return;

    const { data: project, error: projectError } = await client
      .from('projects')
      .select('business_name,website,category,city,competitors,products,services,locations,target_customers,markets')
      .eq('id', input.projectId)
      .maybeSingle();
    if (projectError || !project) throw new Error(projectError?.message ?? 'Project not found for automatic content generation.');

    const drafts = await generateContentBatch({
      topics,
      evidence: input.evidence,
      keywords: [],
      project: {
        business_name: project.business_name,
        website: project.website,
        category: project.category,
        city: project.city,
        competitors: Array.isArray(project.competitors) ? project.competitors as { name: string }[] : [],
        products: project.products,
        services: project.services,
        locations: project.locations,
        target_customers: project.target_customers,
        markets: project.markets,
      },
    });

    const rows = drafts.map((draft) => ({
      project_id: input.projectId,
      audit_id: input.auditId,
      generation_batch_id: input.auditId,
      content_type: 'answer_page',
      title: draft.title,
      buyer_question: draft.question,
      body: draft.body,
      meta_description: draft.metaDescription,
      schema_markup: draft.schemaMarkup as unknown as Json,
      keywords: draft.keywords as unknown as Json,
    }));
    const { error: saveError } = await client.from('generated_content').insert(rows);
    if (saveError) throw new Error(`Could not save generated drafts: ${saveError.message}`);

    await recordOperationalEvent({
      eventType: 'audit_content_drafts_generated',
      projectId: input.projectId,
      auditId: input.auditId,
      metadata: { draftCount: drafts.length },
    }, client);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[audit-content] Draft generation failed for audit ${input.auditId}:`, message);
    await recordOperationalEvent({
      eventType: 'audit_content_drafts_failed',
      severity: 'warning',
      projectId: input.projectId,
      auditId: input.auditId,
      metadata: { error: message.slice(0, 800) },
    }, client).catch((eventError) => {
      console.warn('[audit-content] Could not record draft-generation failure:', eventError);
    });
  }
}
