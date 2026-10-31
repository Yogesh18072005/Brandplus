import type { CSSProperties, ReactNode } from 'react';
import { Wordmark } from '@/components/brand/Logo';
import { ShareLinkButton } from './ShareLinkButton';
import type { SimpleReport as SimpleReportModel, SimpleVerdict } from '@/lib/reports/simple-report';

const VERDICT_LABEL: Record<SimpleVerdict, string> = {
  recommended: 'Recommended you',
  mentioned: 'Mentioned you',
  missed: 'Not mentioned',
  unclear: 'Unclear',
};

const VISIBLE_QUESTIONS = 6;

export function formatReportDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function QuestionCard({ question, index }: { question: SimpleReportModel['questions'][number]; index: number }) {
  return (
    <li className="sr-q" style={{ '--sr-i': Math.min(index, 8) } as CSSProperties}>
      <span className={`sr-chip is-${question.verdict}`}>{VERDICT_LABEL[question.verdict]}</span>
      <p className="sr-q-text">“{question.question}”</p>
      {question.quote && (
        <blockquote className={`sr-quote is-${question.verdict}`}>
          <span>AI answered</span>
          {question.quote}
        </blockquote>
      )}
      {question.competitorsNamed.length > 0 && (
        <p className="sr-q-also">Also named: <strong>{question.competitorsNamed.join(', ')}</strong></p>
      )}
    </li>
  );
}

/**
 * The report a business owner reads in two minutes: the result, who AI sent
 * buyers to instead, what it actually said, and one way forward. The fix plan
 * itself is the reason to come back to us; it is offered, not printed here.
 */
export function SimpleReport({
  model,
  mode,
  cta,
  pdfHref,
  technicalHref,
  sample = false,
  shareHref,
  recheck,
}: {
  model: SimpleReportModel;
  mode: 'public' | 'dashboard';
  cta: ReactNode;
  pdfHref?: string;
  technicalHref?: string | null;
  /** A real past audit shown to prospects, business name hidden. */
  sample?: boolean;
  /** The public link to this report, offered as "Copy share link". */
  shareHref?: string;
  /** A way to ask for the same questions to be re-asked (dashboard only). */
  recheck?: ReactNode;
}) {
  const named = model.recommended + model.mentioned;
  const leader = model.competitors[0] ?? null;
  const headline = leader && leader.answers > named
    ? `${leader.name} was named in ${leader.answers}. ${named === 0 ? `${model.businessName} wasn’t named once.` : `${model.businessName} was named in ${named}.`}`
    : model.headline;
  const rows = [{ name: model.businessName, answers: named, isYou: true }, ...model.competitors.map((rival) => ({ ...rival, isYou: false }))];
  const date = formatReportDate(model.observedOn);
  const maxSource = Math.max(1, ...model.sources.map((source) => source.answers));
  const visible = model.questions.slice(0, VISIBLE_QUESTIONS);
  const hidden = model.questions.slice(VISIBLE_QUESTIONS);
  const dots = [...model.questions].sort((a, b) => ['recommended', 'mentioned', 'unclear', 'missed'].indexOf(a.verdict) - ['recommended', 'mentioned', 'unclear', 'missed'].indexOf(b.verdict));

  return (
    <div className={`zw sr ${mode === 'public' ? 'sr-public' : ''}`}>
      <div className="sr-wrap">
        {mode === 'public' && (
          <header className="sr-top">
            <a href="/" aria-label="BrandPulse home"><Wordmark size={20} /></a>
            <span>{sample ? 'Sample report · a real audit, name hidden' : `AI visibility check${date ? ` · ${date}` : ''}`}</span>
          </header>
        )}

        {mode === 'public' && (
          <div className="sr-title">
            <h1>{model.businessName}</h1>
            {model.website && <p>{model.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>}
          </div>
        )}

        <section className="sr-hero" aria-label="Result">
          <div className="sr-hero-copy">
            <p className="sr-eyebrow">The result</p>
            <p className="sr-big">{named}<small> of {model.total}</small></p>
            <h2>{headline}</h2>
            <p className="sr-meta">We asked {model.engineLabel} {model.total} questions your buyers ask before they choose{date ? `, on ${date}` : ''}.</p>
            <a href="#sr-fix" className="sr-hero-cta">{sample ? 'Get your own report' : 'Get my free fix plan'} <span aria-hidden="true">→</span></a>
          </div>
          <div className="sr-hero-map">
            <div className="sr-dots" role="img" aria-label={`${named} of ${model.total} answers named ${model.businessName}`}>
              {dots.map((question, index) => <i key={question.id} className={`is-${question.verdict}`} style={{ '--sr-c': index } as CSSProperties} />)}
            </div>
            <ul className="sr-legend">
              <li><i className="is-mentioned" />Named you · {named}</li>
              <li><i className="is-missed" />Not mentioned · {model.missed}</li>
              {model.unclear > 0 && <li><i className="is-unclear" />Unclear · {model.unclear}</li>}
            </ul>
          </div>
        </section>

        {model.competitors.length > 0 && (
          <section className="sr-card sr-h2h" aria-label="Head to head">
            <p className="sr-label">Head to head</p>
            <h2>Out of {model.total} buyer questions, how often AI named each business</h2>
            <ul className="sr-h2h-rows">
              {rows.map((row, index) => (
                <li key={row.name} className={row.isYou ? (leader && leader.answers > named ? 'is-you is-behind' : 'is-you') : ''} style={{ '--sr-r': index } as CSSProperties}>
                  <span className="sr-h2h-name">{row.name}{row.isYou && <em>you</em>}</span>
                  <span className="sr-h2h-track"><i style={{ width: `${Math.max(2, (row.answers / Math.max(1, model.total)) * 100)}%` }} /></span>
                  <span className="sr-h2h-count">{row.answers}<small>/{model.total}</small></span>
                </li>
              ))}
            </ul>
            {leader && leader.answers > named && (
              <p className="sr-sub">Every time a buyer asked and AI named {leader.name} but not you, that buyer was sent to a competitor.</p>
            )}
          </section>
        )}

        <section className="sr-card" aria-label="Websites AI used">
          <p className="sr-label">Who AI listened to</p>
          <h2>The websites AI read before answering</h2>
          <p className="sr-sub">Being one of these is how a business gets named. Count is how many of the {model.total} answers used each site.</p>
          {model.sources.length ? (
            <ul className="sr-bars">
              {model.sources.map((source) => (
                <li key={source.domain} className={source.isYou ? 'is-you' : ''}>
                  <span className="sr-bar-name">{source.domain}{source.isYou && <em>your site</em>}</span>
                  <span className="sr-bar"><i style={{ width: `${Math.max(8, (source.answers / maxSource) * 100)}%` }} /></span>
                  <span className="sr-bar-count">{source.answers}</span>
                </li>
              ))}
            </ul>
          ) : <p className="sr-sub">AI didn’t cite specific websites for these answers.</p>}
        </section>

        <section className="sr-card" aria-label="What AI said">
          <p className="sr-label">What AI actually said</p>
          <h2>Your buyers’ questions, and the real answers</h2>
          <p className="sr-sub">Copied word for word from the AI’s answers. The ones that matter most come first.</p>
          <ol className="sr-questions">
            {visible.map((question, index) => <QuestionCard key={question.id} question={question} index={index} />)}
          </ol>
          {hidden.length > 0 && (
            <details className="sr-more">
              <summary>Show all {model.total} questions</summary>
              <ol className="sr-questions">
                {hidden.map((question, index) => <QuestionCard key={question.id} question={question} index={index} />)}
              </ol>
            </details>
          )}
        </section>

        <div id="sr-fix" className="sr-fix">{cta}</div>

        {recheck && (
          <section className="sr-card sr-recheck" aria-label="Re-check">
            <div>
              <p className="sr-label">After your fixes go live</p>
              <h2>Ask the same {model.total} questions again</h2>
              <p className="sr-sub">We re-ask them the same way, so you see exactly what changed. Nothing runs until we confirm it with you.</p>
            </div>
            {recheck}
          </section>
        )}

        <footer className="sr-foot">
          <p>
            How we checked: {model.total} real buyer questions asked to {model.engineLabel}{date ? ` on ${date}` : ''}. AI answers change over time, so we re-ask the same questions after fixes go live.
          </p>
          <div>
            {pdfHref && <a href={pdfHref} className="sr-foot-link">Download PDF</a>}
            {shareHref && <ShareLinkButton href={shareHref} />}
            {technicalHref && <a href={technicalHref} className="sr-foot-link">Technical report</a>}
          </div>
        </footer>
      </div>
    </div>
  );
}
