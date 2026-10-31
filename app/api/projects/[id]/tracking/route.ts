import { NextResponse } from 'next/server';
import { canTrackWeekly } from '@/lib/billing/capabilities';
import { getEffectivePlan } from '@/lib/billing/effective-plan';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { loadIntelligenceReportHistory } from '@/lib/reports/load-intelligence-report';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: project } = await supabase.from('projects')
    .select('id,business_name')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const { data: profile } = await supabase.from('profiles')
    .select('plan,plan_expires_at')
    .eq('id', user.id)
    .maybeSingle();
  if (!canTrackWeekly(getEffectivePlan(profile))) {
    return NextResponse.json({ error: 'Visibility tracking requires a paid plan.', code: 'tracking_requires_paid_plan' }, { status: 403 });
  }

  try {
    const reports = await loadIntelligenceReportHistory(id);
    const entries = reports.map((report) => ({
      id: report.id,
      reportId: report.id,
      observationDate: report.summary.observationDate ?? report.generatedAt,
      meaningfulAppearances: report.summary.meaningfulAppearances,
      totalQuestions: report.summary.totalQuestions,
      mentioned: report.summary.mentioned,
      recommended: report.summary.recommended,
      notMentioned: report.summary.notMentioned,
      inconclusive: report.summary.inconclusive,
      statement: report.summary.statement,
      buyerQuestionSetId: report.chain.buyerQuestionSetId,
    }));
    const latest = entries.at(-1);
    const previous = entries.at(-2);
    const appearanceChange = latest && previous
      ? latest.meaningfulAppearances - previous.meaningfulAppearances
      : null;
    const observations = latest && previous ? [
      `Meaningful appearances changed from ${previous.meaningfulAppearances} of ${previous.totalQuestions} to ${latest.meaningfulAppearances} of ${latest.totalQuestions}.`,
      latest.buyerQuestionSetId === previous.buyerQuestionSetId
        ? 'Both observations used the same frozen buyer-question set.'
        : 'These observations used different frozen buyer-question sets, so compare the counts with that context.',
      'Observed changes do not establish traffic, ranking, revenue impact, or causality.',
    ] : [];
    return NextResponse.json({
      projectName: project.business_name,
      entries,
      summary: { appearanceChange, observations },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Canonical tracking could not be loaded' }, { status: 500 });
  }
}