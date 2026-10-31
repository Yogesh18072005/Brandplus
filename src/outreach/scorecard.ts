// The audit scorecard: five pillars, each made of visible checks with points.
// Pure and deterministic — every point on the report traces to a check the
// reader can see, so the grade is explainable rather than a vibe.

import { REVIEW_PROFILES, type ProfileKind } from '../footprint/profiles';
import { firstMoves, possessive, snapshotTotals, sourceOwner, type OutreachQuestion, type OutreachReportFile } from './model';

export type PillarId = 'presence' | 'citations' | 'technical' | 'content' | 'offsite';

export interface Check {
  label: string;
  pass: boolean;
  /** What was actually observed, in plain words. */
  detail: string;
  points: number;
  earned: number;
}

export interface Pillar {
  id: PillarId;
  name: string;
  question: string;
  weight: number;
  /** 0–100, or null when the pillar could not be checked (site unreachable). */
  score: number | null;
  checks: Check[];
  fixes: string[];
}

export interface Scorecard {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  pillars: Pillar[];
  strengths: string[];
  verdict: string;
}

const PROFILE_LABEL: Record<ProfileKind, string> = {
  linkedin: 'LinkedIn', youtube: 'YouTube', x: 'X', instagram: 'Instagram', facebook: 'Facebook', github: 'GitHub',
  g2: 'G2', capterra: 'Capterra', producthunt: 'Product Hunt', trustpilot: 'Trustpilot', crunchbase: 'Crunchbase',
  justdial: 'Justdial', indiamart: 'IndiaMART', googlemaps: 'Google Maps', practo: 'Practo', clutch: 'Clutch',
};

const PROBE_LABEL = { accurate: 'accurate', partial: 'vague', wrong: 'wrong', unknown: 'that it doesn’t know you' } as const;
const ENTITY_TYPES = /^(Organization|Corporation|LocalBusiness|ProfessionalService|.*Business|.*Store|Dentist|MedicalClinic|LegalService|SoftwareApplication)$/;

function check(label: string, points: number, pass: boolean, detail: string, partial?: number): Check {
  const earned = pass ? points : Math.max(0, Math.min(points, partial ?? 0));
  return { label, pass, detail, points, earned };
}

function pillarScore(checks: Check[]): number {
  const possible = checks.reduce((s, c) => s + c.points, 0);
  return possible ? Math.round((checks.reduce((s, c) => s + c.earned, 0) / possible) * 100) : 0;
}

export function gradeFor(score: number): Scorecard['grade'] {
  return score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const names = (n: number) => (n === 1 ? 'names' : 'name');

export function buildScorecard(file: OutreachReportFile): Scorecard {
  const name = file.report.business.name;
  const software = file.businessType === 'software';
  const competitors = file.report.competitors.map((c) => c.name);
  const totals = snapshotTotals(file.current, competitors);
  const rival = totals.competitors[0] && totals.competitors[0].count > 0 ? totals.competitors[0] : null;
  const usable = Math.max(totals.usable, 1);
  const mentionedOnly = totals.appeared - totals.recommended;
  const site = file.site;
  const home = site?.homepage ?? null;

  // 1. AI answer presence — the measured core.
  const presenceRaw = Math.round(((totals.recommended + 0.5 * mentionedOnly) / usable) * 100);
  const presence: Pillar = {
    id: 'presence', name: 'AI answer presence', weight: 40,
    question: `When buyers ask about ${file.report.business.category}, does the answer name ${name}?`,
    score: presenceRaw,
    checks: [
      check('Named in buyer answers', 50, totals.appeared / usable >= 0.5, `Named in ${totals.appeared} of ${totals.usable} answers.`, Math.round((totals.appeared / usable) * 50)),
      check('Recommended, not just mentioned', 50, totals.recommended / usable >= 0.5, `Recommended in ${totals.recommended} of ${totals.usable}.`, Math.round((totals.recommended / usable) * 50)),
    ],
    fixes: [],
  };
  if (rival) presence.checks.push(check(`Ahead of ${rival.name}`, 0, totals.appeared >= rival.count, `${rival.name} was named in ${rival.count} of ${totals.usable}.`));
  const lost = file.current.questions.filter((q) => q.outcome === 'absent' && q.competitors.length > 0).length;
  if (lost > 0) presence.fixes.push(`Publish the pieces under "What to publish first". Each one answers one of the ${plural(lost, 'question')} where a competitor was named instead of you.`);
  if (rival && totals.appeared < rival.count) presence.fixes.push(`Give the AI a page that compares ${name} with ${rival.name} honestly, so it has something to quote when buyers weigh the two.`);
  if (mentionedOnly > 0) presence.fixes.push(`Turn passing mentions into recommendations: state plainly who ${name} is best for, so the answer can recommend it, not just list it.`);

  // 2. Citation sources — what the AI quotes.
  const sources = file.report.citationGap;
  const competitorSiteCites = sources.filter((s) => sourceOwner(s.domain, competitors)).reduce((sum, s) => sum + s.count, 0);
  const ownCites = Math.round(file.report.scores.citationRate * totals.usable);
  const reviewProfiles = (home?.profiles ?? []).filter((p) => REVIEW_PROFILES.includes(p));
  const footprint = file.footprint;
  const readPages = footprint?.citedPages.filter((p) => p.status === 'read') ?? [];
  const namingYou = readPages.filter((p) => p.brandNamed);
  const namingRivals = readPages.filter((p) => p.competitorsNamed.length > 0);
  const directories = footprint?.directories.filter((d) => d.listed !== null) ?? [];
  const listed = directories.filter((d) => d.listed);
  const unlisted = directories.filter((d) => !d.listed);
  const citations: Pillar = {
    id: 'citations', name: 'Citation sources', weight: 20,
    question: 'When the AI explains its answer, does it quote you or someone else?',
    score: null,
    checks: [
      check('Your website is quoted as a source', 40, file.report.scores.citationRate >= 0.2,
        ownCites === 0 ? `${possessive(name)} website was not cited in any answer.` : `${possessive(name)} website was cited in ${plural(ownCites, 'answer')}.`,
        file.report.scores.citationRate > 0 ? 20 : 0),
      check('Competitors don’t own the sources', 30, competitorSiteCites <= ownCites,
        competitorSiteCites ? `Competitors' own websites were cited ${plural(competitorSiteCites, 'time')}.` : 'No competitor website dominated the sources.'),
      directories.length
        ? check('Listed where the AI looks', 30, listed.length === directories.length,
          `${listed.length ? `Listed on ${listed.map((d) => d.domain).join(', ')}. ` : ''}${unlisted.length ? `A search found no listing on ${unlisted.map((d) => d.domain).join(', ')}, which the answers cited ${plural(unlisted.reduce((n, d) => n + d.citedIn, 0), 'time')}. Worth checking by hand.` : ''}`.trim(),
          Math.round((listed.length / directories.length) * 30))
        : check('Listed on review or directory sites', 30, reviewProfiles.length > 0,
          reviewProfiles.length ? `Your homepage links to ${reviewProfiles.map((p) => PROFILE_LABEL[p]).join(', ')}.` : 'Your homepage links to no review or directory profile.'),
    ],
    fixes: firstMoves(file, 4).filter((m) => !/^Publish/.test(m.title) && !/^Make your own site/.test(m.title)).map((m) => m.title),
  };
  if (readPages.length) {
    citations.checks.push(check('Named on the pages AI read', 30, namingYou.length / readPages.length >= 0.25,
      `The answers cited ${plural(readPages.length, 'page')} we could open. ${namingYou.length ? `${namingYou.length} ${names(namingYou.length)} ${name}` : `None name ${name}`}${namingRivals.length ? `; ${namingRivals.length} ${names(namingRivals.length)} a competitor` : ''}.`,
      Math.round(Math.min(1, namingYou.length / readPages.length / 0.25) * 30)));
    const targets = [...new Set(namingRivals.filter((p) => !p.brandNamed).map((p) => p.domain))].slice(0, 3);
    if (targets.length) citations.fixes.unshift(`Get onto the pages the AI already reads to answer buyers: ${targets.join(', ')} name your competitors and not you.`);
  }
  if (unlisted.length) citations.fixes.unshift(`Check for and complete profiles on ${unlisted.map((d) => d.domain).join(' and ')}. The AI cited ${unlisted.length === 1 ? 'it' : 'them'} when answering your buyers, and a search found no listing for you.`);
  citations.score = pillarScore(citations.checks);
  if (citations.fixes.length === 0) {
    citations.fixes.push(software ? 'Complete your G2 and Capterra profiles and ask your best customers for reviews.' : 'Complete your Google Business Profile and the directories your buyers use, and ask happy customers for reviews.');
  }

  const pillars: Pillar[] = [presence, citations];

  // 3–5 need the website.
  if (site && home) {
    const robots = site.robots;
    const technical: Pillar = {
      id: 'technical', name: 'Technical readiness', weight: 20,
      question: 'Can AI crawlers read and understand your website?',
      score: null,
      checks: [
        check('AI crawlers allowed', 25, robots.blocked.length === 0,
          robots.blocked.length ? `robots.txt blocks ${robots.blocked.join(', ')}.` : robots.explicitlyNamed.length ? `robots.txt explicitly welcomes ${plural(robots.explicitlyNamed.length, 'AI crawler')}.` : 'No AI crawler is blocked.'),
        check('Readable without JavaScript', 20, home.visibleWords >= 150 && !home.appShell,
          home.appShell ? 'The homepage is an empty JavaScript shell to crawlers.' : `The homepage serves ${home.visibleWords.toLocaleString('en-US')} words of real text in its HTML.`),
        check('Structured data', 15, home.jsonLdTypes.length > 0,
          home.jsonLdTypes.length ? `Schema found: ${home.jsonLdTypes.slice(0, 4).join(', ')}.` : 'No schema.org structured data on the homepage.'),
        check('FAQ or HowTo schema', 10, home.hasFaqSchema, home.hasFaqSchema ? 'Question-and-answer schema is present.' : 'No FAQ or HowTo schema.'),
        check('llms.txt', 10, site.llmsTxt, site.llmsTxt ? 'An llms.txt file is published.' : 'No llms.txt file.'),
        check('Sitemap', 10, site.sitemap, site.sitemap ? 'sitemap.xml is published.' : 'No sitemap.xml found.'),
        check('Title and description', 10, !!home.title && home.metaDescription.length >= 50,
          home.metaDescription ? 'The homepage has a title and meta description.' : 'The homepage has no meta description.'),
      ],
      fixes: [],
    };
    const pages = site.pages ?? [];
    if (pages.length > 1) {
      const oneH1 = pages.filter((pg) => pg.h1.length === 1).length;
      const described = pages.filter((pg) => pg.metaDescription.length >= 50).length;
      const entity = [...new Set(pages.flatMap((pg) => pg.jsonLdTypes))].filter((t) => ENTITY_TYPES.test(t));
      const loads = pages.map((pg) => pg.loadMs).sort((a, b) => a - b);
      const median = loads[Math.floor(loads.length / 2)]!;
      technical.checks.push(
        check('One clear heading per page', 10, oneH1 / pages.length >= 0.8,
          oneH1 === 0 ? `None of the ${pages.length} pages we checked has an H1 heading.` : `${oneH1} of ${pages.length} pages have exactly one H1.`, Math.round((oneH1 / pages.length) * 10)),
        check('Descriptions on key pages', 10, described / pages.length >= 0.8,
          `${described} of ${pages.length} pages have a meta description.`, Math.round((described / pages.length) * 10)),
        check('Business identified in schema', 10, entity.length > 0,
          entity.length ? `Schema names the business as ${entity.join(', ')}.` : 'No page tells machines who the business is (no Organization or LocalBusiness schema).'),
        check('Pages load quickly', 5, median <= 2500,
          median <= 2500 ? `Pages return their HTML in about ${(median / 1000).toFixed(1)}s.` : `Half the pages took over ${(median / 1000).toFixed(1)}s to return their HTML.`),
      );
      if (oneH1 / pages.length < 0.8) technical.fixes.push('Give every key page one H1 that says plainly what the page is about.');
      if (described / pages.length < 0.8) technical.fixes.push('Write a meta description for each key page that says who it serves and where.');
      if (median > 2500) technical.fixes.push('Speed up page responses; AI crawlers give up on slow pages.');
    }
    if (robots.blocked.length) technical.fixes.push(`Unblock ${robots.blocked.join(', ')} in robots.txt so AI search can read the site.`);
    if (home.appShell || home.visibleWords < 150) technical.fixes.push('Server-render the key pages so crawlers see the text without running JavaScript.');
    if (!home.hasFaqSchema) technical.fixes.push('Add FAQ schema to the pages that answer buyer questions.');
    if (!site.llmsTxt) technical.fixes.push(`Publish /llms.txt stating what ${name} is, who it serves and where.`);
    if (!home.jsonLdTypes.length) technical.fixes.push(`Add ${software ? 'Organization and SoftwareApplication' : 'Organization and LocalBusiness'} schema to the homepage.`);
    technical.score = pillarScore(technical.checks);

    const s = home.sections;
    const content: Pillar = {
      id: 'content', name: 'Answer-ready content', weight: 10,
      question: 'Is there a page on your site that answers what buyers ask?',
      score: null,
      checks: [
        check('Comparison or alternatives pages', 30, s.comparison, s.comparison ? 'The site links to comparison pages.' : 'No "vs" or "alternatives" pages linked.'),
        check('Questions answered directly', 25, s.faq, s.faq ? 'FAQ or question-style content found.' : 'No FAQ page or question-style headings.'),
        check('Guides, blog or resources', 25, s.content || s.docs, s.content || s.docs ? 'The site publishes guides or articles.' : 'No guides, blog or resources section.'),
        check(software ? 'Public pricing' : 'Proof of work', 20, software ? s.pricing : s.caseStudies,
          software ? (s.pricing ? 'Pricing is public.' : 'No public pricing page linked.') : (s.caseStudies ? 'Case studies or testimonials are linked.' : 'No case studies or testimonials linked.')),
      ],
      fixes: [],
    };
    const sitePages = site.pages ?? [];
    if (sitePages.length > 1) {
      const blocks = [...new Set(sitePages.flatMap((pg) => pg.answerBlocks.map((b) => b.toLowerCase())))];
      content.checks.push(check('Answer blocks AI can quote', 25, blocks.length >= 3,
        blocks.length ? `${plural(blocks.length, 'question heading')} across ${sitePages.length} pages ${blocks.length === 1 ? 'is' : 'are'} followed by a short, direct answer.` : `None of the ${sitePages.length} pages puts a short, direct answer under a question heading.`,
        Math.round((Math.min(blocks.length, 3) / 3) * 25)));
      if (blocks.length < 3) content.fixes.push('Under each question heading, answer it directly in 40–60 words first, then add detail. That is the block AI lifts as a quote.');
    }
    const hype = site.hypeClaims;
    if (hype) {
      const pagesWithHype = new Set(hype.map((h) => h.url)).size;
      content.checks.push(check('Claims backed by proof', 20, hype.length <= 1,
        hype.length ? `${plural(hype.length, 'unproven claim')} on ${plural(pagesWithHype, 'page')}, like “${hype[0]!.phrase}”.` : 'No unproven “best” or “leading” claims.',
        hype.length <= 3 ? 10 : 0));
      if (hype.length > 1) content.fixes.push(`Replace “${hype[0]!.phrase}” and similar claims with proof: a number, a named client result, or a rating with its source. AI engines discount self-praise they can’t verify.`);
    }
    if (!s.comparison && rival) content.fixes.push(`Publish "${name} vs ${rival.name}" and "${rival.name} alternatives" pages.`);
    if (!s.faq) content.fixes.push('Turn the top missed buyer questions into an FAQ, one clear answer each.');
    if (!(s.content || s.docs)) content.fixes.push('Start a guides section titled with the exact questions buyers ask.');
    content.score = pillarScore(content.checks);

    const p = new Set(home.profiles);
    const offsite: Pillar = {
      id: 'offsite', name: 'Off-site presence', weight: 10,
      question: 'Does the rest of the web know who you are?',
      score: null,
      checks: [
        check('LinkedIn', 25, p.has('linkedin'), p.has('linkedin') ? 'LinkedIn profile linked.' : 'No LinkedIn profile linked.'),
        check('YouTube', 25, p.has('youtube'), p.has('youtube') ? 'YouTube channel linked.' : 'No YouTube channel linked.'),
        check('Review or directory profile', 25, reviewProfiles.length > 0 || listed.length > 0,
          reviewProfiles.length ? `${reviewProfiles.map((k) => PROFILE_LABEL[k]).join(', ')} linked.`
            : listed.length ? `Listed on ${listed.map((d) => d.domain).join(', ')}, though the site doesn’t link to it.` : 'No review or directory profile linked.'),
        check('Other social channels', 25, ['x', 'instagram', 'facebook', 'github'].some((k) => p.has(k as ProfileKind)),
          ['x', 'instagram', 'facebook', 'github'].filter((k) => p.has(k as ProfileKind)).map((k) => PROFILE_LABEL[k as ProfileKind]).join(', ') || 'None linked.'),
      ],
      fixes: [],
    };
    const probe = footprint?.probe;
    if (probe) {
      offsite.checks.unshift(check('AI knows who you are', 40, probe.verdict === 'accurate',
        `Asked “What is ${name}?”, Gemini’s answer was ${PROBE_LABEL[probe.verdict]}. ${probe.summary}`.trim(),
        probe.verdict === 'partial' ? 20 : 0));
      if (probe.verdict !== 'accurate') offsite.fixes.unshift(`Make the basics unmissable: an About page, Organization schema and directory profiles that all say the same thing about what ${name} does, where, and for whom.`);
    }
    if (!p.has('youtube')) offsite.fixes.push('Start a YouTube channel answering buyer questions on camera; AI reads the transcripts.');
    if (!p.has('linkedin')) offsite.fixes.push('Create and link a company LinkedIn page.');
    offsite.score = pillarScore(offsite.checks);

    pillars.push(technical, content, offsite);
  } else {
    const reason = site ? 'Your website could not be reached for these checks.' : 'Website checks were not run for this report.';
    for (const [id, nameText, weight, question] of [
      ['technical', 'Technical readiness', 20, 'Can AI crawlers read and understand your website?'],
      ['content', 'Answer-ready content', 10, 'Is there a page on your site that answers what buyers ask?'],
      ['offsite', 'Off-site presence', 10, 'Does the rest of the web know who you are?'],
    ] as const) {
      pillars.push({ id, name: nameText, weight, question, score: null, checks: [{ label: 'Not checked', pass: false, detail: reason, points: 0, earned: 0 }], fixes: [] });
    }
  }

  const scored = pillars.filter((p) => p.score !== null);
  const weightSum = scored.reduce((s, p) => s + p.weight, 0);
  const score = Math.round(scored.reduce((s, p) => s + (p.score! * p.weight), 0) / Math.max(weightSum, 1));

  // Strengths: true, specific, and the reader can verify each one.
  const strengths: string[] = [];
  if (totals.appeared > 0) strengths.push(`is already named in ${totals.appeared} of ${totals.usable} buyer answers`);
  if (site?.robots.explicitlyNamed.length && !site.robots.blocked.length) strengths.push('has a robots.txt that explicitly welcomes AI crawlers');
  if (home && home.visibleWords >= 300 && !home.appShell) strengths.push(`serves ${home.visibleWords.toLocaleString('en-US')} words of real content that crawlers can read`);
  if (home?.jsonLdTypes.length) strengths.push('already has structured data on its homepage');
  if (home?.sections.content) strengths.push('already publishes guides and articles');
  if (footprint?.probe?.verdict === 'accurate') strengths.push('is described accurately when someone asks AI who it is');
  if (namingYou.length) strengths.push(`already appears on ${plural(namingYou.length, 'page')} the AI reads to answer buyers`);
  if (reviewProfiles.length) strengths.push(`has ${reviewProfiles.map((k) => PROFILE_LABEL[k]).join(' and ')} presence to build on`);

  const weakest = pillars.slice(1).filter((p) => p.score !== null).sort((a, b) => a.score! - b.score!)[0];
  const fixKind = !weakest ? 'content and citations'
    : weakest.id === 'technical' ? 'technical and content'
    : weakest.id === 'offsite' ? 'presence and citations'
    : 'content and citations';
  const leading = !rival || totals.appeared >= rival.count;
  const strongPresence = totals.appeared / usable >= 0.6;
  // When leading, the next sentence states the presence, so don't repeat it as a compliment.
  const openerStrengths = leading && strongPresence ? strengths.slice(1) : strengths;
  const opener = openerStrengths.length
    ? `${name} ${openerStrengths.slice(0, 2).join(' and ')}.`
    : `${name} has a clear product and a working website to build on.`;
  const gap = leading && strongPresence
    ? ` When buyers ask AI about ${file.report.business.category}, it named ${name} in ${totals.appeared} of ${totals.usable} answers${rival ? `, ahead of ${rival.name} (${rival.count})` : ''}.`
    : rival
      ? ` Yet when buyers ask AI about ${file.report.business.category}, it named ${name} in ${totals.appeared} of ${totals.usable} answers, and ${rival.name} in ${rival.count}.`
      : ` Yet when buyers ask AI about ${file.report.business.category}, it named ${name} in only ${totals.appeared} of ${totals.usable} answers.`;
  const diagnosis = ownCites === 0 && competitorSiteCites > 0
    ? ` The answers quote competitors' own pages ${plural(competitorSiteCites, 'time')} and ${possessive(name)} none.`
    : '';
  const close = leading && strongPresence
    ? ` The lead is real but not locked in: ${weakest ? `${weakest.name.toLowerCase()} is the weakest pillar, and the place a rival can overtake you.` : 'keep publishing to hold it.'}`
    : ` This is a ${fixKind} fix, not a rebuild.`;
  const verdict = `${opener}${gap}${diagnosis}${close}`;

  return { score, grade: gradeFor(score), pillars, strengths, verdict };
}

export interface PublishBrief {
  format: 'Page' | 'Video';
  title: string;
  targets: string[];
  rivalsNamed: string[];
  include: string[];
}

/** Ghostwriter-ready briefs: what to publish first, each aimed at a question the audit lost. */
export function publishBriefs(file: OutreachReportFile, limit = 5): PublishBrief[] {
  const name = file.report.business.name;
  const competitors = file.report.competitors.map((c) => c.name);
  const totals = snapshotTotals(file.current, competitors);
  const rival = totals.competitors[0]?.count ? totals.competitors[0].name : null;
  const misses = file.current.questions.filter((q) => q.outcome === 'absent' && q.competitors.length > 0);
  const briefs: PublishBrief[] = [];
  if (rival) {
    briefs.push({
      format: 'Page', title: `${name} vs ${rival}: an honest comparison`,
      targets: misses.filter((q) => q.competitors.includes(rival)).slice(0, 2).map((q) => q.text),
      rivalsNamed: [rival],
      include: ['A side-by-side table: price, setup time, who each one is for', `One thing ${rival} genuinely does better`, `Who should not choose ${name}`],
    });
  }
  for (const q of misses) {
    if (briefs.length >= limit) break;
    const video = briefs.length % 2 === 1;
    briefs.push({
      format: video ? 'Video' : 'Page',
      title: q.text.replace(/\s+/g, ' ').trim(),
      targets: [q.text],
      rivalsNamed: q.competitors,
      include: video
        ? ['Answer the question fully in the first 90 seconds', 'Hold a comparison table on screen long enough to read', 'Say the category and the buyer’s constraint out loud so it lands in the transcript']
        : ['The direct answer in the first two sentences', `Where ${name} fits, and where ${q.competitors[0]} fits better`, 'FAQ schema on the page'],
    });
  }
  return briefs.slice(0, limit);
}

export interface RivalReason {
  label: string;
  them: string;
  you: string;
}

export interface RivalCase {
  rival: string;
  reasons: RivalReason[];
}

const PROOF_WORDS = /review|rating|rated|star|clutch|goodfirms|google|award|client/i;

/**
 * "Why the top rival gets named and you don't", built only from what this
 * audit observed: the rival's proof the AI repeated, the directories it leaned
 * on that you're missing from, and self-praise on your site it can't verify.
 */
export function rivalCase(file: OutreachReportFile): RivalCase | null {
  const name = file.report.business.name;
  const competitors = file.report.competitors.map((c) => c.name);
  const totals = snapshotTotals(file.current, competitors);
  const top = totals.competitors[0];
  if (!top || top.count <= totals.appeared) return null;
  const rival = top.name;
  const reasons: RivalReason[] = [];

  const quoted = file.current.questions.filter((q) => q.competitors.includes(rival) && q.quote.toLowerCase().includes(rival.split(' ')[0]!.toLowerCase()));
  const proof = quoted.find((q) => /\d/.test(q.quote) && PROOF_WORDS.test(q.quote)) ?? quoted[0];
  if (proof) {
    reasons.push({
      label: 'What the AI says',
      them: `“${proof.quote}”`,
      you: totals.appeared ? `It named ${name} in ${totals.appeared} of ${totals.usable} answers.` : `Nothing. It didn’t name ${name} in any of ${totals.usable} answers.`,
    });
  }

  const missing = (file.footprint?.directories ?? []).filter((d) => d.listed === false);
  const rivalPages = (file.footprint?.citedPages ?? []).filter((p) => p.status === 'read' && !p.brandNamed && p.competitorsNamed.includes(rival));
  if (missing.length) {
    reasons.push({
      label: 'Where the AI looks',
      them: `The answers leaned on ${missing.map((d) => d.domain).join(', ')} ${missing.reduce((s, d) => s + d.citedIn, 0)} times.`,
      you: `A search found no ${name} listing on ${missing.length === 1 ? 'it' : 'any of them'}.`,
    });
  } else if (rivalPages.length) {
    reasons.push({
      label: 'Where the AI looks',
      them: `${rivalPages.length} of the pages the AI read name ${rival}.`,
      you: `None of those pages name ${name}.`,
    });
  }

  const hype = file.site?.hypeClaims?.[0];
  if (hype) {
    reasons.push({
      label: 'What your site says',
      them: proof && PROOF_WORDS.test(proof.quote) ? `It quotes outside proof about ${rival}, like the line above.` : `It names ${rival} from what other sites say about them.`,
      you: `Your site calls ${name} “${hype.phrase}”. The AI can’t check that, so it doesn’t repeat it.`,
    });
  }
  return reasons.length ? { rival, reasons } : null;
}

/** Lost questions worth showing as proof: a rival was named, highest buyer intent first. */
export function evidenceQuestions(file: OutreachReportFile, limit = 6) {
  const weight = new Map(file.prompts.map((p) => [p.text, p.intentWeight ?? 0]));
  const city = file.businessType === 'local' ? file.report.business.city.toLowerCase() : '';
  const score = (q: OutreachQuestion) => (weight.get(q.text) ?? 0) * 10 + (city && q.text.toLowerCase().includes(city) ? 5 : 0) + q.competitors.length;
  return file.current.questions
    .filter((q) => q.outcome === 'absent' && q.competitors.length > 0)
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit);
}
