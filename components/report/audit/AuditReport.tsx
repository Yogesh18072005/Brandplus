import type { ReactNode } from 'react';
import Link from 'next/link';
import { Wordmark } from '@/components/brand/Logo';
import { PrintPageButton } from '@/components/report/PrintPageButton';
import { RevealOnScroll } from '@/components/report/audit/RevealOnScroll';
import { bookingHref, founderName, whatsappHref } from '@/lib/marketing/contact';
import {
  compareSnapshots,
  headline,
  possessive,
  snapshotTotals,
  sourceOwner,
  type OutreachQuestion,
  type OutreachReportFile,
  type QuestionOutcome,
} from '@/src/outreach/model';
import { buildScorecard, evidenceQuestions, publishBriefs, rivalCase, type Pillar } from '@/src/outreach/scorecard';

const OUTCOME: Record<QuestionOutcome, string> = {
  recommended: 'Recommended',
  mentioned: 'Mentioned',
  absent: 'Not named',
  failed: 'No answer',
};

const RING = 2 * Math.PI * 52;

const PROBE_HEADLINE = {
  accurate: 'It knows who you are.',
  partial: 'It half-knows who you are.',
  wrong: 'It gets you wrong.',
  unknown: 'It doesn’t know you exist.',
} as const;

const PROBE_VERDICT = {
  accurate: 'Accurate',
  partial: 'Vague: misses what you mainly do',
  wrong: 'Wrong compared with your website',
  unknown: 'Couldn’t say who you are',
} as const;

function shortPath(url: string) {
  try {
    const path = new URL(url).pathname.replace(/\/$/, '');
    return path.length > 42 ? `${path.slice(0, 40)}…` : path;
  } catch {
    return '';
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Wrap every rival name in a mark, matching the homepage answer card. */
function markNames(text: string, names: string[]): ReactNode[] {
  const clean = names.filter((n) => n.trim().length > 1).sort((a, b) => b.length - a.length);
  if (!text || clean.length === 0) return [text];
  const re = new RegExp(`(${clean.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.split(re).map((part, i) =>
    clean.some((n) => n.toLowerCase() === part.toLowerCase()) ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>,
  );
}

function Eyebrow({ children, dot = false }: { children: ReactNode; dot?: boolean }) {
  return <p className="ar-eyebrow">{dot && <i aria-hidden="true" />}{children}</p>;
}

function ScoreRing({ score, grade, size = 'lg' }: { score: number; grade: string; size?: 'lg' | 'sm' }) {
  return (
    <div className={`ar-ring ar-ring-${size}`} role="img" aria-label={`Score ${score} out of 100, grade ${grade}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="52" className="ar-ring-track" />
        <circle cx="60" cy="60" r="52" className="ar-ring-value" strokeDasharray={RING} style={{ ['--ar-ring-offset' as string]: `${RING * (1 - score / 100)}` }} />
      </svg>
      <div className="ar-ring-label"><strong>{score}</strong><span>/100</span></div>
    </div>
  );
}

function AnswerCard({ q, name }: { q: OutreachQuestion; name: string }) {
  const named = q.outcome === 'recommended' || q.outcome === 'mentioned';
  return (
    <article className="ar-answer">
      <p className="ar-answer-q"><span aria-hidden="true">›</span>{q.text}</p>
      <div className="ar-answer-body">
        <p className="ar-answer-engine"><span aria-hidden="true">✳</span> Gemini</p>
        {q.quote ? <blockquote>“{markNames(q.quote, q.competitors)}”</blockquote> : <blockquote>Named {q.competitors.join(', ')}.</blockquote>}
      </div>
      <p className={`ar-answer-verdict ${named ? 'is-named' : ''}`}><i aria-hidden="true" />{named ? `${name} was ${q.outcome}` : `${name} wasn’t mentioned`}</p>
      {q.reason && <p className="ar-answer-why">Why we asked: {q.reason}</p>}
    </article>
  );
}

/** WhatsApp first (where owners actually reply), the booking link second. */
function ContactButtons({ whatsapp, booking }: { whatsapp: string | null; booking: string | null }) {
  return (
    <div className="ar-offer-actions">
      {whatsapp && <a href={whatsapp} className="ar-btn ar-btn-white" target="_blank" rel="noopener noreferrer">Message me on WhatsApp <span aria-hidden="true">↗</span></a>}
      {booking && <a href={booking} className={`ar-btn ${whatsapp ? 'ar-btn-ghost' : 'ar-btn-white'}`}>Book a 15-minute call <span aria-hidden="true">↗</span></a>}
      {!whatsapp && <Link href="/sprint" className="ar-btn ar-btn-ghost">See how it works</Link>}
    </div>
  );
}

function PillarMeter({ pillar }: { pillar: Pillar }) {
  const score = pillar.score;
  return (
    <li className="ar-meter">
      <div className="ar-meter-head">
        <span>{pillar.name}</span>
        <span className="ar-meter-weight">{pillar.weight}%</span>
        <strong>{score === null ? '—' : score}</strong>
      </div>
      <div className="ar-meter-track"><div className={`ar-meter-fill ${score !== null && score < 40 ? 'is-low' : ''}`} style={{ width: `${score ?? 0}%` }} /></div>
    </li>
  );
}

/**
 * showFixes: the step-by-step fixes are what we sell, so the public report
 * shows what's wrong and keeps the how for the call. Only the founder sees them.
 */
export function AuditReport({ file, showFixes = false }: { file: OutreachReportFile; showFixes?: boolean }) {
  const business = file.report.business;
  const name = business.name;
  const competitors = file.report.competitors.map((c) => c.name);
  const totals = snapshotTotals(file.current, competitors);
  const card = buildScorecard(file);
  const briefs = publishBriefs(file);
  const misses = file.current.questions.filter((q) => q.outcome === 'absent' && q.competitors.length > 0);
  const named = file.current.questions.filter((q) => q.outcome === 'recommended' || q.outcome === 'mentioned');
  const lead = misses[0] ?? named[0] ?? file.current.questions[0];
  const diff = file.baseline ? compareSnapshots(file.baseline, file.current) : null;
  const before = file.baseline ? snapshotTotals(file.baseline, competitors) : null;
  const sources = file.report.citationGap.slice(0, 8).map((s) => ({ ...s, owner: sourceOwner(s.domain, competitors) }));
  const cta = bookingHref(`AI visibility: ${name}`);
  const founder = founderName();
  const maxCount = Math.max(totals.usable, 1);
  const failed = file.current.questions.length - totals.usable;
  const site = business.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const evidence = misses.length ? evidenceQuestions(file) : named.slice(0, 6);
  const why = rivalCase(file);
  const whatsapp = whatsappHref(`Hi, I read the AI visibility report for ${name}. Can we talk about what you'd fix first?`);
  const probe = file.footprint?.probe ?? null;
  // Readable pages first, so the count in the heading matches the top of the list.
  const citedPages = [...(file.footprint?.citedPages ?? [])].sort((a, b) => Number(b.status === 'read') - Number(a.status === 'read') || b.citedIn - a.citedIn).slice(0, 10);
  const readPages = (file.footprint?.citedPages ?? []).filter((p) => p.status === 'read');
  const directories = (file.footprint?.directories ?? []).filter((d) => d.listed !== null);

  return (
    <div className="ar">
      <RevealOnScroll />

      {/* ── Cover: the homepage deck, made real ─────────────────────────── */}
      <header className="ar-cover">
        <div className="ar-arc ar-arc-a" aria-hidden="true" /><div className="ar-arc ar-arc-b" aria-hidden="true" />
        <div className="ar-bar ar-wrap">
          <Link href="/" className="ar-brand" aria-label="BrandPulse home"><Wordmark tone="light" size={18} /></Link>
          <div className="ar-bar-meta"><span>AI visibility audit · {formatDate(file.current.observedAt)}</span><PrintPageButton /></div>
        </div>

        <div className="ar-cover-grid ar-wrap">
          <div className="ar-cover-copy">
            <Eyebrow dot>Prepared for {site}</Eyebrow>
            <h1>{name}</h1>
            <p className="ar-cover-headline">{headline(file)}</p>
            <p className="ar-cover-sub">{business.category}{file.businessType === 'software' ? ` · buyers in ${file.region}` : ` · ${business.city}`}</p>
          </div>

          <div className="ar-deck" aria-label="Summary of this audit">
            <div className="ar-card ar-card-question">
              <span className="ar-card-label">The buyer asked</span>
              <p>“{lead?.text}”</p>
              <span className="ar-card-foot">One of {file.current.questions.length} questions we asked</span>
            </div>
            <div className="ar-card ar-card-score">
              <span className="ar-card-label">Your score</span>
              <div className="ar-card-score-row"><ScoreRing score={card.score} grade={card.grade} size="sm" /><span className={`ar-grade ar-grade-${card.grade}`}>{card.grade}</span></div>
              <span className="ar-card-foot">Across five pillars, weighted</span>
            </div>
            {lead && (
              <div className="ar-card ar-card-answer">
                <span className="ar-card-label"><span aria-hidden="true">✳</span> Gemini answered</span>
                <p>“{markNames(lead.quote || `Named ${lead.competitors.join(', ')}.`, lead.competitors)}”</p>
                <span className={`ar-card-verdict ${lead.outcome === 'absent' ? '' : 'is-named'}`}><i aria-hidden="true" />{lead.outcome === 'absent' ? `${name} wasn’t mentioned` : `${name} was ${lead.outcome}`}</span>
              </div>
            )}
            {briefs[0] && (
              <div className="ar-card ar-card-move">
                <span className="ar-card-label">Your first move</span>
                <p>{briefs[0].title}</p>
                <span className="ar-card-foot">{briefs[0].format} · aimed at a question you lost</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ── Personal note: a person ran this, not a tool ─────────────── */}
        <section className="ar-paper ar-paper-tight">
          <div className="ar-wrap">
            <div className="ar-note-card">
              <p>
                I asked Google’s Gemini {file.current.questions.length} questions your buyers ask about {business.category}{file.businessType === 'software' ? '' : ` in ${business.city}`}, and recorded who it named.
                Every quote below is the AI’s own words, so you can ask it yourself and check.
              </p>
              {founder && <p className="ar-signed">{founder} · BrandPulse</p>}
            </div>
          </div>
        </section>

        {/* ── Verdict + scoreboard ────────────────────────────────────── */}
        <section className="ar-paper">
          <div className="ar-wrap ar-verdict">
            <div>
              <Eyebrow>The verdict</Eyebrow>
              <p className="ar-verdict-text">{card.verdict}</p>
            </div>
            <div className="ar-scoreboard" data-reveal>
              <div className="ar-scoreboard-head">
                <ScoreRing score={card.score} grade={card.grade} />
                <div><span className={`ar-grade ar-grade-${card.grade}`}>{card.grade}</span><p>Five things decide whether AI names you. Weighted by how much each moves the answer.</p></div>
              </div>
              <ul>{card.pillars.map((p) => <PillarMeter key={p.id} pillar={p} />)}</ul>
            </div>
          </div>
        </section>

        {/* ── Head to head ───────────────────────────────────────────── */}
        <section className="ar-ink">
          <div className="ar-wrap">
            <div className="ar-head">
              <Eyebrow dot>Head to head</Eyebrow>
              <h2>Who the AI names.<br /><span>Out of {totals.usable} buyer questions.</span></h2>
            </div>
            <ol className="ar-race" data-reveal>
              {[{ name, count: totals.appeared, you: true }, ...totals.competitors.map((c) => ({ ...c, you: false }))].map((row) => (
                <li key={row.name} className={row.you ? 'is-you' : ''}>
                  <span className="ar-race-name">{row.name}{row.you && <em>you</em>}</span>
                  <div className="ar-race-track"><div className="ar-race-fill" style={{ width: `${(row.count / maxCount) * 100}%` }} /></div>
                  <strong>{row.count}<span>/{totals.usable}</span></strong>
                </li>
              ))}
            </ol>
            {file.competitorsDiscovered && <p className="ar-note">We didn’t pick these competitors. They are the companies the answers named most often.</p>}

            {diff && before && file.baseline && (
              <div className="ar-recheck" data-reveal>
                <div><Eyebrow>Re-check · same {diff.comparable} questions</Eyebrow><p className="ar-recheck-big">{before.appeared} <span>→</span> {totals.appeared}</p><p>answers named {name}, {formatDate(file.baseline.observedAt)} → {formatDate(file.current.observedAt)}</p></div>
                <dl>
                  <div><dt>Improved</dt><dd className="is-up">{diff.improved}</dd></div>
                  <div><dt>Declined</dt><dd className="is-down">{diff.declined}</dd></div>
                  <div><dt>Unchanged</dt><dd>{diff.unchanged}</dd></div>
                </dl>
              </div>
            )}
          </div>
        </section>

        {/* ── Why the rival wins ───────────────────────────────────── */}
        {why && (
          <section className="ar-paper">
            <div className="ar-wrap">
              <div className="ar-head">
                <Eyebrow>The reason</Eyebrow>
                <h2>Why {why.rival} gets named.<br /><span>And why {name} doesn’t.</span></h2>
              </div>
              <div className="ar-why" data-reveal>
                <div className="ar-why-row ar-why-cols" aria-hidden="true"><span /><strong>{why.rival}</strong><strong>{name}</strong></div>
                {why.reasons.map((r) => (
                  <div key={r.label} className="ar-why-row">
                    <span className="ar-why-label">{r.label}</span>
                    <p className="ar-why-them"><em>{why.rival}</em>{r.them}</p>
                    <p className="ar-why-you"><em>{name}</em>{r.you}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Evidence ──────────────────────────────────────────────── */}
        {evidence.length > 0 && (
          <section className="ar-paper">
            <div className="ar-wrap">
              <div className="ar-head">
                <Eyebrow>The evidence</Eyebrow>
                <h2>{misses.length ? 'What your buyers are reading.' : 'Where you’re already named.'}<br /><span>Quoted word for word.</span></h2>
                <p className="ar-head-note">Ask Gemini any of these questions yourself to check.</p>
              </div>
              <div className="ar-answers">{evidence.map((q) => <AnswerCard key={q.text} q={q} name={name} />)}</div>
            </div>
          </section>
        )}

        {/* ── Ask while it stings: right after the proof ──────────────── */}
        {misses.length > 0 && (whatsapp || cta) && (
          <section className="ar-offer ar-offer-mid">
            <div className="ar-wrap ar-offer-grid">
              <div>
                <Eyebrow dot>This is fixable</Eyebrow>
                <h2>{misses.length === 1 ? 'One answer' : `${misses.length} answers`} named a competitor instead of you.<br />They can name you.</h2>
              </div>
              <div className="ar-offer-copy">
                <p>I’ll show you what I’d change first for {name}, and what it would take. 15 minutes, no pitch if it isn’t useful.</p>
                <ContactButtons whatsapp={whatsapp} booking={cta} />
              </div>
            </div>
          </section>
        )}

        {/* ── What AI says about you ────────────────────────────────── */}
        {probe && (
          <section className="ar-paper ar-paper-tight">
            <div className="ar-wrap ar-probe">
              <div className="ar-head">
                <Eyebrow>What AI says about you</Eyebrow>
                <h2>{PROBE_HEADLINE[probe.verdict]}<br /><span>We asked it directly.</span></h2>
                {probe.summary && <p className="ar-head-note">{probe.summary}</p>}
              </div>
              <div className="ar-probe-grid">
                <article className="ar-answer">
                  <p className="ar-answer-q"><span aria-hidden="true">›</span>{probe.question}</p>
                  <div className="ar-answer-body">
                    <p className="ar-answer-engine"><span aria-hidden="true">✳</span> Gemini</p>
                    <blockquote>“{probe.quote}”</blockquote>
                  </div>
                  <p className={`ar-answer-verdict ${probe.verdict === 'accurate' ? 'is-named' : ''}`}><i aria-hidden="true" />{PROBE_VERDICT[probe.verdict]}</p>
                </article>
                {probe.issues.length > 0 && (
                  <div>
                    <h4 className="ar-probe-h">Compared with your website</h4>
                    <ul className="ar-checks">{probe.issues.map((issue) => <li key={issue} className="is-fail"><i aria-hidden="true">×</i><span>{issue}</span></li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Every question ────────────────────────────────────────── */}
        <section className="ar-paper ar-paper-tight">
          <div className="ar-wrap">
            <div className="ar-head">
              <Eyebrow>Every question we asked</Eyebrow>
              <h2>The full set.<br /><span>Nothing left out.</span></h2>
            </div>
            <ol className="ar-questions">
              {file.current.questions.map((q) => (
                <li key={q.text}>
                  <span className="ar-q-text">{q.text}{q.reason && <span className="ar-q-why">Why we asked: {q.reason}</span>}</span>
                  <span className="ar-q-who">{q.outcome === 'absent' && q.competitors.length > 0 ? `Named ${q.competitors.slice(0, 2).join(', ')}` : ''}</span>
                  <span className={`ar-chip ar-chip-${q.outcome}`}>{OUTCOME[q.outcome]}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Pillars in detail ─────────────────────────────────────── */}
        <section className="ar-paper">
          <div className="ar-wrap">
            <div className="ar-head">
              <Eyebrow>Where the score comes from</Eyebrow>
              <h2>Five pillars.<br /><span>What we found, and the fix for each.</span></h2>
            </div>
            <div className="ar-pillars">
              {card.pillars.map((p) => (
                <article key={p.id} className="ar-pillar">
                  <header>
                    <div><h3>{p.name}</h3><p>{p.question}</p></div>
                    <div className="ar-pillar-score"><strong>{p.score === null ? '—' : p.score}</strong><span>{p.score === null ? 'not checked' : `/100 · ${p.weight}% of score`}</span></div>
                  </header>
                  <div className="ar-pillar-cols">
                    <div>
                      <h4>What we found</h4>
                      <ul className="ar-checks">{p.checks.map((c) => <li key={c.label} className={c.pass ? 'is-pass' : 'is-fail'}><i aria-hidden="true">{c.pass ? '✓' : '×'}</i><span><strong>{c.label}</strong>{c.detail}</span></li>)}</ul>
                    </div>
                    <div>
                      <h4>The fix</h4>
                      {!showFixes && p.fixes.length ? <p className="ar-muted">{p.fixes.length === 1 ? 'One specific fix' : `${p.fixes.length} specific fixes`} for {name}. I walk you through {p.fixes.length === 1 ? 'it' : 'them'} on the call.</p>
                        : p.fixes.length ? <ul className="ar-fixes">{p.fixes.map((f) => <li key={f}>{f}</li>)}</ul> : <p className="ar-muted">{p.score === null ? 'Run the website checks to see fixes here.' : p.score >= 70 ? 'Nothing urgent here. Keep it this way.' : 'Start with the pieces under “What to publish first” below.'}</p>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Sources ───────────────────────────────────────────────── */}
        {citedPages.length > 0 && (
          <section className="ar-paper ar-paper-tight">
            <div className="ar-wrap ar-sources-wrap">
              <div className="ar-head">
                <Eyebrow>The pages AI read</Eyebrow>
                <h2>{readPages.length ? `${readPages.filter((p) => p.brandNamed).length} of ${readPages.length} name ${name}.` : 'The sources behind the answers.'}<br /><span>The pages Gemini cited when it answered your buyers.</span></h2>
                <p className="ar-head-note">We opened each one and looked for {name} and your competitors.</p>
              </div>
              <ul className="ar-sources">
                {citedPages.map((p) => (
                  <li key={p.url}>
                    <span className="ar-src-text">
                      <span className="ar-src-domain">{p.domain}<span className="ar-src-path">{shortPath(p.url)}</span></span>
                      <span className={p.brandNamed ? 'ar-src-owner' : 'ar-src-miss'}>
                        {p.status === 'blocked' ? 'Blocks automated readers, so not checked'
                          : p.brandNamed ? `Names ${name}`
                          : p.competitorsNamed.length ? `Names ${p.competitorsNamed.slice(0, 2).join(', ')}, not you` : `Doesn’t name ${name}`}
                      </span>
                    </span>
                    <strong>{p.citedIn}×</strong>
                  </li>
                ))}
              </ul>
              {directories.length > 0 && (
                <ul className="ar-checks ar-dirs">
                  {directories.map((d) => (
                    <li key={d.domain} className={d.listed ? 'is-pass' : 'is-fail'}>
                      <i aria-hidden="true">{d.listed ? '✓' : '×'}</i>
                      <span><strong>{d.domain}</strong>{d.listed ? 'You have a listing here.' : 'A search found no listing for you here; worth checking by hand.'} The answers cited it {d.citedIn}×.</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {citedPages.length === 0 && sources.length > 0 && (
          <section className="ar-paper ar-paper-tight">
            <div className="ar-wrap ar-sources-wrap">
              <div className="ar-head">
                <Eyebrow>Who the AI trusts</Eyebrow>
                <h2>The sources behind the answers.<br /><span>Ranked by how many answers cited them.</span></h2>
              </div>
              <ul className="ar-sources">
                {sources.map((s) => (
                  <li key={s.domain}>
                    <span className="ar-src-text">
                      <span className="ar-src-domain">{s.domain}</span>
                      {s.owner && <span className="ar-src-owner">{possessive(s.owner)} own site</span>}
                    </span>
                    <strong>{s.count}×</strong>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── What to publish first ─────────────────────────────────── */}
        {briefs.length > 0 && (
          <section className="ar-ink">
            <div className="ar-wrap">
              <div className="ar-head">
                <Eyebrow dot>What to publish first</Eyebrow>
                <h2>{briefs.length === 1 ? 'One piece' : `${briefs.length} pieces`}, in this order.<br /><span>Each one targets a question you’re missing from today.</span></h2>
              </div>
              <ol className="ar-briefs">
                {briefs.map((b, i) => (
                  <li key={b.title}>
                    <div className="ar-brief-top"><span className="ar-brief-n">{String(i + 1).padStart(2, '0')}</span><span className={`ar-brief-format is-${b.format.toLowerCase()}`}>{b.format}</span></div>
                    <h3>{b.title}</h3>
                    {b.rivalsNamed.length > 0 && <p className="ar-brief-rivals">Today this question names {b.rivalsNamed.slice(0, 3).join(', ')}.</p>}
                    {showFixes && <ul>{b.include.map((x) => <li key={x}>{x}</li>)}</ul>}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* ── The offer ─────────────────────────────────────────────── */}
        <section className="ar-offer">
          <div className="ar-arc ar-arc-c" aria-hidden="true" />
          <div className="ar-wrap ar-offer-grid">
            <div>
              <Eyebrow dot>We can do this for you</Eyebrow>
              <h2>You approve.<br />We write, publish and re-check.</h2>
            </div>
            <div className="ar-offer-copy">
              <p>Every piece above, researched and written for you, aimed at the exact questions in this report. Each month we re-run the same {file.current.questions.length} questions, so you see what changed, question by question.</p>
              <ContactButtons whatsapp={whatsapp} booking={cta} />
              {founder && <p className="ar-signed">{founder} · BrandPulse</p>}
            </div>
          </div>
        </section>

        {/* ── Method ────────────────────────────────────────────────── */}
        <footer className="ar-method ar-wrap">
          <p>
            <strong>How this was measured.</strong> {file.current.questions.length} buyer questions, each asked once to {file.engine.provider} (model {file.engine.model}) on {formatDate(file.current.observedAt)}. {Math.round(file.engine.groundedShare * 100)}% of answers used live search. {failed > 0 ? `${failed} returned no usable answer and are not counted. ` : ''}
            {file.site ? `Website checks read ${site} as a crawler would, without running JavaScript, on ${formatDate(file.site.checkedAt)}. ` : ''}
            Answers vary between runs, accounts and locations, so treat this as a snapshot, not a ranking. ChatGPT, Claude and Perplexity were not measured in this audit.
          </p>
          <p>Prepared by BrandPulse for {name}.</p>
        </footer>
      </main>
    </div>
  );
}
