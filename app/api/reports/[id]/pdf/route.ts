import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { ReportPdfDocument } from '@/components/report/ReportPdfDocument';
import { currentUserCanViewFullReport, currentUserIntelligenceReportDepth } from '@/lib/reports/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { loadIntelligenceReportHistory } from '@/lib/reports/load-intelligence-report';
import { getIntelligenceReport } from '@/lib/reports/cached-intelligence-report';
import { simpleReportFor } from '@/lib/reports/load-simple-report';
import { SimpleReportPdf } from '@/components/report/simple/SimpleReportPdf';
import { getAppUrl } from '@/lib/app-url';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';
import { currentViewerIsOps } from '@/lib/auth/current-ops';
import { loadLegacyReport } from '@/lib/reports/load-report';
import { buildCanonicalReportViewModel, buildLegacyReportViewModel, reportPreview, type CustomerReportViewModel } from '@/lib/reports/report-view-model';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeFilename(value: string): string {
  const normalized = value.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `${normalized || 'brandpulse'}-ai-visibility-check.pdf`;
}

type SavedContentDraft = {
  buyer_question: string | null;
  title: string;
  body: string;
  meta_description: string | null;
};

async function loadOwnedContentDrafts(projectId: string): Promise<SavedContentDraft[] | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!project) return null;

    const admin = createAdminClient();
    const { data: latest, error: latestError } = await admin
      .from('generated_content')
      .select('generation_batch_id')
      .eq('project_id', projectId)
      .eq('content_type', 'answer_page')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) {
      console.error('[report-pdf] Could not locate the latest content batch:', latestError.message);
      return null;
    }
    if (!latest) return [];
    if (!latest.generation_batch_id) {
      // Drafts created before batch metadata was introduced: retain the latest
      // saved set so users do not have to spend Gemini quota to export them.
      const { data: legacyDrafts, error: legacyError } = await admin
        .from('generated_content')
        .select('buyer_question,title,body,meta_description')
        .eq('project_id', projectId)
        .eq('content_type', 'answer_page')
        .order('created_at', { ascending: false })
        .limit(5);
      if (legacyError) {
        console.error('[report-pdf] Could not load older saved drafts:', legacyError.message);
        return null;
      }
      return (legacyDrafts ?? []).reverse().map((draft) => ({
        buyer_question: draft.buyer_question,
        title: draft.title,
        body: draft.body,
        meta_description: draft.meta_description,
      }));
    }

    const { data, error } = await admin
      .from('generated_content')
      .select('buyer_question,title,body,meta_description')
      .eq('project_id', projectId)
      .eq('generation_batch_id', latest.generation_batch_id)
      .eq('content_type', 'answer_page')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[report-pdf] Could not load saved content drafts:', error.message);
      return null;
    }
    return (data ?? []).map((draft) => ({
      buyer_question: draft.buyer_question,
      title: draft.title,
      body: draft.body,
      meta_description: draft.meta_description,
    }));
  } catch {
    return null;
  }
}

function renderReport(model: CustomerReportViewModel, full: boolean) {
  const document = createElement(ReportPdfDocument, { model, full }) as unknown as Parameters<typeof renderToBuffer>[0];
  return renderToBuffer(document);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const searchParams = new URL(request.url).searchParams;
  const technical = searchParams.get('view') === 'technical';
  const includeDrafts = searchParams.get('includeDrafts') === '1';
  const disposition = searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment';
  if (!id || id.length > 100) return Response.json({ error: 'Invalid report reference.' }, { status: 400 });
  // Rendering a PDF is CPU-heavy and the link is shareable: cap it per network.
  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.reportPdf);
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Too many downloads. Try again in a few minutes.');

  const intelligence = await getIntelligenceReport(id);
  if (intelligence) {
    if (intelligence.status === 'INCOMPLETE') {
      return Response.json({ error: 'The evidence report is still being prepared.' }, { status: 409 });
    }
    const depth = await currentUserIntelligenceReportDepth(intelligence.projectId);
    const full = depth === 'full';
    // Everyone downloads the plain-language report; the technical document
    // lists the fixes, so only the founder can download it.
    if (!technical || !(await currentViewerIsOps())) {
      const simple = await simpleReportFor(intelligence);
      const drafts = includeDrafts ? await loadOwnedContentDrafts(intelligence.projectId) : [];
      if (drafts === null) return Response.json({ error: 'Sign in as the project owner to view generated page drafts.' }, { status: 403 });
      const document = createElement(SimpleReportPdf, { model: simple, reportUrl: `${getAppUrl()}/r/${id}`, drafts }) as unknown as Parameters<typeof renderToBuffer>[0];
      const buffer = await renderToBuffer(document);
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `${disposition}; filename="${safeFilename(simple.businessName)}"`,
          'Cache-Control': 'private, no-store, max-age=0',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    const history = full ? await loadIntelligenceReportHistory(intelligence.projectId, 12) : [];
    const previousReport = history
      .filter((item) => item.chain.interventionRunId !== intelligence.chain.interventionRunId)
      .filter((item) => new Date(item.generatedAt).getTime() < new Date(intelligence.generatedAt).getTime())
      .at(-1) ?? null;
    const completeModel = buildCanonicalReportViewModel(intelligence, previousReport);
    const model = full ? completeModel : reportPreview(completeModel);
    const buffer = await renderReport(model, full);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename(model.business.name)}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  const report = await loadLegacyReport(id);
  if (!report) return Response.json({ error: 'Report not found.' }, { status: 404 });
  const sample = !UUID_PATTERN.test(id);
  const full = sample || await currentUserCanViewFullReport(id);
  if (!full) return Response.json({ error: 'Sign in with the report owner account to download this historical report.' }, { status: 403 });
  const model = buildLegacyReportViewModel(id, report);
  const buffer = await renderReport(model, true);
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeFilename(model.business.name)}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
