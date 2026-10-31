import { NextResponse } from 'next/server';
import { runAuditPipeline } from '@/src/pipeline';
import { generatePrompts } from '@/src/promptgen';
import type { AuditInput, BuyerPrompt } from '@/src/types';
import * as fs from 'fs';
import * as path from 'path';
import { authorizeServiceRequest } from '@/lib/auth/service-request';
import { guardMutationRequest } from '@/lib/http/request-security';
import { consumeRateLimit, RATE_LIMITS, rateLimitError } from '@/lib/security/rate-limit';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Legacy/internal endpoint. The supported customer path is /api/audits,
  // which enforces ownership and credits. Keep this off unless a founder
  // deliberately enables it for a controlled diagnostic.
  if (process.env.DIRECT_AUDIT_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const guard = guardMutationRequest(request, { json: true, maxBodyBytes: 16 * 1024 });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const auth = authorizeServiceRequest(request, ['ADMIN_SECRET']);
  if (!auth.configured) {
    return NextResponse.json({ error: 'Service authentication is not configured' }, { status: 503 });
  }
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rateLimit = await consumeRateLimit(request, RATE_LIMITS.directAudit, 'direct-audit');
  if (!rateLimit.allowed) return rateLimitError(rateLimit, 'Direct audit trigger limit reached.');

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { businessName, website, category, city, competitors, promptCount } = body;

  if (
    typeof businessName !== 'string' ||
    typeof website !== 'string' ||
    typeof category !== 'string' ||
    typeof city !== 'string' ||
    !businessName.trim() ||
    !website.trim() ||
    !category.trim() ||
    !city.trim()
  ) {
    return NextResponse.json(
      { error: 'businessName, website, category, city are required' },
      { status: 400 }
    );
  }

  const competitorList = (Array.isArray(competitors) ? competitors : [])
    .slice(0, 5)
    .map((c: unknown) =>
      typeof c === 'string'
        ? { name: c.trim().slice(0, 80) }
        : c && typeof c === 'object' && typeof (c as { name?: unknown }).name === 'string'
          ? { name: (c as { name: string }).name.trim().slice(0, 80) }
          : null
    )
    .filter((c): c is { name: string } => Boolean(c?.name));

  const safePromptCount = Number.isFinite(Number(promptCount))
    ? Math.min(40, Math.max(1, Math.floor(Number(promptCount))))
    : 20;

  const input: AuditInput = {
    businessName,
    website,
    category,
    city,
    competitors: competitorList,
  };

  try {
    const prompts: BuyerPrompt[] = await generatePrompts(category, city, safePromptCount);
    let completed = 0;

    const result = await runAuditPipeline(input, prompts, {
      onProgress(done, total) {
        completed = done;
        console.log(`[run-audit] ${done}/${total} prompts processed`);
      },
    });

    const reportId = `direct-${Date.now()}`;
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(
      path.join(reportsDir, `${reportId}.json`),
      JSON.stringify(result.report, null, 2)
    );

    return NextResponse.json({
      reportId,
      reportUrl: `/r/${reportId}`,
      scores: result.report.scores,
      competitors: result.report.competitors,
      costSummary: result.costSummary,
      quotaExhausted: result.quotaExhausted,
      promptsProcessed: prompts.length,
      topRecommendations: result.results
        .filter((r) => r.parsed?.mention_type === 'top_recommendation')
        .length,
      totalMentions: result.results.filter((r) => r.parsed?.brand_mentioned).length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[run-audit] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
