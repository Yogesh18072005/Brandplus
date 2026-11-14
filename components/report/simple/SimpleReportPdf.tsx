import { Circle, Document, Link, Page, Path, Rect, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import type { SimpleReport, SimpleVerdict } from '@/lib/reports/simple-report';

// The downloadable version of the simple report: the same story in two or three
// A4 pages. Built-in Helvetica only (WinAnsi), so no arrows or tick glyphs.

const c = {
  paper: '#EDEDF4',
  card: '#FFFFFF',
  soft: '#F5F4FA',
  line: '#E2E1EE',
  text: '#15141F',
  muted: '#5F5D75',
  faint: '#8C8AA1',
  blue: '#463EDA',
  blueDeep: '#2A1BCC',
  blueNight: '#201381',
  mint: '#A9FFDF',
  mintDeep: '#0E7A5C',
  coral: '#C9402F',
  coralSoft: '#FBECEA',
  ink: '#0F0E16',
};

const s = StyleSheet.create({
  page: { backgroundColor: c.paper, color: c.text, fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.45, paddingTop: 28, paddingBottom: 40, paddingHorizontal: 32 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  topRight: { fontSize: 7.5, color: c.faint, letterSpacing: 1, textTransform: 'uppercase' },
  name: { fontSize: 26, fontFamily: 'Helvetica-Bold', letterSpacing: -1, lineHeight: 1.05 },
  site: { fontSize: 9.5, color: c.muted, marginTop: 3, marginBottom: 10 },
  hero: { backgroundColor: c.blueDeep, borderRadius: 16, padding: 20, color: '#FFFFFF' },
  eyebrow: { fontSize: 7.5, letterSpacing: 1.4, textTransform: 'uppercase', color: '#DCDBFD' },
  bigRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 },
  big: { fontSize: 54, fontFamily: 'Helvetica-Bold', letterSpacing: -3, lineHeight: 1 },
  bigOf: { fontSize: 22, color: '#DCDBFD', marginLeft: 6, marginBottom: 8 },
  headline: { fontSize: 14.5, fontFamily: 'Helvetica-Bold', lineHeight: 1.3, marginTop: 10, maxWidth: 400 },
  heroMeta: { fontSize: 9, color: '#E8E6FE', marginTop: 8, maxWidth: 400 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  dot: { width: 13, height: 13, borderRadius: 4, marginRight: 5, marginBottom: 5 },
  row: { flexDirection: 'row', marginTop: 10 },
  card: { backgroundColor: c.card, borderRadius: 14, padding: 14, borderWidth: 0.6, borderColor: c.line },
  label: { fontSize: 7.5, letterSpacing: 1.2, textTransform: 'uppercase', color: c.faint, marginBottom: 6 },
  h2: { fontSize: 13.5, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  sub: { fontSize: 8.8, color: c.muted, marginBottom: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  barName: { width: 120, fontSize: 8.8, fontFamily: 'Courier' },
  barTrack: { flexGrow: 1, height: 7, backgroundColor: c.soft, borderRadius: 4, marginHorizontal: 8 },
  barCount: { width: 14, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  stat: { flexGrow: 1, flexBasis: 0, backgroundColor: c.soft, borderRadius: 10, padding: 10, marginRight: 6 },
  statValue: { fontSize: 24, fontFamily: 'Helvetica-Bold', marginTop: 4 },
  statLabel: { fontSize: 8, color: c.muted },
  rival: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.6, borderBottomColor: c.line, fontSize: 9 },
  q: { backgroundColor: c.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 0.6, borderColor: c.line },
  chip: { alignSelf: 'flex-start', fontSize: 7, letterSpacing: 0.8, textTransform: 'uppercase', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 4, marginBottom: 6 },
  qText: { fontSize: 9.5, fontFamily: 'Courier-Bold', lineHeight: 1.4 },
  quote: { marginTop: 8, backgroundColor: c.soft, borderLeftWidth: 2.5, padding: 9, fontSize: 9.5, lineHeight: 1.5, color: '#2C2B3B' },
  quoteLabel: { fontSize: 6.8, letterSpacing: 1, textTransform: 'uppercase', color: c.faint, marginBottom: 3 },
  also: { fontSize: 8.5, color: c.muted, marginTop: 6 },
  cta: { backgroundColor: c.ink, borderRadius: 16, padding: 18, color: '#FFFFFF' },
  ctaTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', lineHeight: 1.25, marginTop: 4 },
  ctaBody: { fontSize: 9.5, color: '#B0AEC5', marginTop: 8, maxWidth: 420 },
  ctaPoint: { fontSize: 9.5, color: '#E0DFEE', marginTop: 3 },
  ctaButton: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: c.mint, color: '#0D2B22', fontFamily: 'Helvetica-Bold', fontSize: 10, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8, textDecoration: 'none' },
  footer: { position: 'absolute', bottom: 20, left: 34, right: 34, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: c.faint },
  section: { fontSize: 18, fontFamily: 'Helvetica-Bold', letterSpacing: -0.4, marginBottom: 4 },
  draftQuestion: { fontSize: 8, color: c.blue, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  draftTitle: { fontSize: 21, fontFamily: 'Helvetica-Bold', lineHeight: 1.2, marginBottom: 8 },
  draftMeta: { fontSize: 8.5, color: c.muted, marginBottom: 14, lineHeight: 1.5 },
  draftH2: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 5, lineHeight: 1.25 },
  draftH3: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 9, marginBottom: 4 },
  draftP: { fontSize: 9.5, lineHeight: 1.55, marginBottom: 7 },
  draftLi: { fontSize: 9.5, lineHeight: 1.5, marginBottom: 4, paddingLeft: 10 },
  draftNotice: { marginTop: 16, padding: 10, backgroundColor: c.soft, borderRadius: 8, fontSize: 8, color: c.muted, lineHeight: 1.45 },
});

const VERDICT: Record<SimpleVerdict, { label: string; color: string; bg: string }> = {
  recommended: { label: 'Recommended you', color: c.mintDeep, bg: '#E3F3EC' },
  mentioned: { label: 'Mentioned you', color: c.mintDeep, bg: '#E3F3EC' },
  missed: { label: 'Not mentioned', color: c.coral, bg: c.coralSoft },
  unclear: { label: 'Unclear', color: c.muted, bg: c.soft },
};

const DIRECTORY_DOMAINS = new Set([
  'justdial.com', 'sulekha.com', 'indiamart.com', 'tradeindia.com', 'exportersindia.com',
  'connect2india.com', 'indiayellowpages.com', 'yellowpages.in', 'yelp.com', 'clutch.co',
  'ambitionbox.com', 'mouthshut.com', 'grotal.com', 'thomasnet.com', 'kompass.com',
  'go4worldbusiness.com', 'trustpilot.com', 'glassdoor.com', 'facebook.com', 'linkedin.com',
]);

function Mark() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Svg viewBox="4 4 56 56" style={{ width: 13, height: 13, marginRight: 5 }}>
        <Rect x={4} y={4} width={56} height={56} rx={16} fill="#463EDA" />
        <Path d="M13 34h8.5l5.5-13 9.5 23 5.5-12h4.5" stroke="#FFFFFF" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Circle cx={51.5} cy={32} r={4.2} fill="#1FC58A" />
      </Svg>
      <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', letterSpacing: -0.3 }}>brandpulse</Text>
    </View>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

type PdfContentDraft = {
  buyer_question: string | null;
  title: string;
  body: string;
  meta_description: string | null;
};

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function draftBlocks(body: string): { kind: 'h2' | 'h3' | 'p' | 'li'; text: string }[] {
  const blocks = [...body.matchAll(/<(h2|h3|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((match) => ({
      kind: match[1]!.toLowerCase() as 'h2' | 'h3' | 'p' | 'li',
      text: decodeHtml(match[2]!.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')).trim(),
    }))
    .filter((block) => block.text.length > 0);
  if (blocks.length) return blocks;
  const plain = decodeHtml(body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')).trim();
  return plain ? [{ kind: 'p', text: plain }] : [];
}

function countDraftWords(body: string): number {
  return draftBlocks(body).map((block) => block.text).join(' ').trim().split(/\s+/).filter(Boolean).length;
}

export function SimpleReportPdf({ model, reportUrl, drafts = [] }: { model: SimpleReport; reportUrl: string; drafts?: PdfContentDraft[] }) {
  const named = model.recommended + model.mentioned;
  const date = formatDate(model.observedOn);
  const maxSource = Math.max(1, ...model.sources.map((source) => source.answers));
  const missedQuestions = model.questions.filter((question) => question.verdict === 'missed').slice(0, 5);
  const citedDirectories = model.sources
    .filter((source) => DIRECTORY_DOMAINS.has(source.domain) && !source.isYou)
    .slice(0, 5);
  const footer = (
    <View style={s.footer} fixed>
      <Text>{model.businessName} · AI visibility check{date ? ` · ${date}` : ''}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );

  return (
    <Document title={`${model.businessName} - AI visibility check`} author="BrandPulse" language="en">
      <Page size="A4" style={s.page}>
        <View style={s.top}><Mark /><Text style={s.topRight}>AI visibility check{date ? ` · ${date}` : ''}</Text></View>
        <Text style={s.name}>{model.businessName}</Text>
        <Text style={s.site}>{model.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</Text>

        <View style={s.hero}>
          <Text style={s.eyebrow}>The result</Text>
          <View style={s.bigRow}><Text style={s.big}>{named}</Text><Text style={s.bigOf}>of {model.total}</Text></View>
          <Text style={s.headline}>{model.headline}</Text>
          <Text style={s.heroMeta}>We asked {model.engineLabel} {model.total} questions your buyers ask before they choose{date ? `, on ${date}` : ''}.</Text>
          <View style={s.dots}>
            {model.questions.map((question) => (
              <View key={question.id} style={[s.dot, question.verdict === 'missed'
                ? { borderWidth: 1, borderColor: '#ACA7ED' }
                : { backgroundColor: question.verdict === 'unclear' ? '#766BCE' : c.mint }]} />
            ))}
          </View>
        </View>

        <View style={s.row}>
          <View style={[s.card, { flexGrow: 1.4, flexBasis: 0, marginRight: 10 }]}>
            <Text style={s.label}>Who AI listened to</Text>
            <Text style={s.h2}>The websites AI read before answering</Text>
            <Text style={s.sub}>How many of the {model.total} answers used each site.</Text>
            {model.sources.slice(0, 5).map((source) => (
              <View key={source.domain} style={s.barRow}>
                <Text style={[s.barName, source.isYou ? { color: c.mintDeep } : {}]}>{source.domain}{source.isYou ? ' (you)' : ''}</Text>
                <View style={s.barTrack}><View style={{ width: `${Math.max(8, (source.answers / maxSource) * 100)}%`, height: 7, borderRadius: 4, backgroundColor: source.isYou ? c.mintDeep : c.blue }} /></View>
                <Text style={s.barCount}>{source.answers}</Text>
              </View>
            ))}
          </View>
          <View style={[s.card, { flexGrow: 1, flexBasis: 0 }]}>
            <Text style={s.label}>Breakdown</Text>
            <View style={{ flexDirection: 'row' }}>
              <View style={s.stat}><Text style={s.statLabel}>Named</Text><Text style={[s.statValue, named ? { color: c.mintDeep } : {}]}>{named}</Text></View>
              <View style={s.stat}><Text style={s.statLabel}>Missed</Text><Text style={[s.statValue, { color: c.coral }]}>{model.missed}</Text></View>
              <View style={[s.stat, { marginRight: 0 }]}><Text style={s.statLabel}>Unclear</Text><Text style={s.statValue}>{model.unclear}</Text></View>
            </View>
            {model.competitors.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={s.label}>Competitors AI named</Text>
                {model.competitors.map((rival) => <View key={rival.name} style={s.rival}><Text style={{ fontFamily: 'Helvetica-Bold' }}>{rival.name}</Text><Text style={{ color: c.muted }}>{rival.answers} {rival.answers === 1 ? 'answer' : 'answers'}</Text></View>)}
              </View>
            )}
          </View>
        </View>

        <View style={[s.cta, { marginTop: 10 }]} wrap={false}>
          <Text style={[s.eyebrow, { color: c.mint }]}>Your fix plan</Text>
          <Text style={s.ctaTitle}>{model.gaps > 0 ? `You’re missing from ${model.gaps} of ${model.total} answers. That’s fixable.` : 'Want to stay ahead?'}</Text>
          <Text style={s.ctaBody}>Your fix plan shows exactly which pages to publish and where to get listed, in order, so AI starts naming {model.businessName}. We can also do the work for you.</Text>
          <Text style={s.ctaPoint}>-  Which pages to add or change, most important first</Text>
          <Text style={s.ctaPoint}>-  The buyer questions each page answers</Text>
          <Text style={s.ctaPoint}>-  Where to get listed so AI trusts you</Text>
          <Link src={`${reportUrl}#sr-fix`} style={s.ctaButton}>Get my fix plan</Link>
        </View>
        {footer}
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.label}>What AI actually said</Text>
        <Text style={s.section}>Your buyers’ questions, and the real answers</Text>
        <Text style={[s.sub, { marginBottom: 12 }]}>Copied word for word from the AI’s answers.</Text>
        {model.questions.map((question) => {
          const verdict = VERDICT[question.verdict];
          return (
            <View key={question.id} style={s.q} wrap={false}>
              <Text style={[s.chip, { color: verdict.color, backgroundColor: verdict.bg }]}>{verdict.label}</Text>
              <Text style={s.qText}>“{question.question}”</Text>
              {question.quote && (
                <View style={[s.quote, { borderLeftColor: question.verdict === 'missed' ? c.coral : c.blue }]}>
                  <Text style={s.quoteLabel}>AI answered</Text>
                  <Text>{question.quote}</Text>
                </View>
              )}
              {question.competitorsNamed.length > 0 && <Text style={s.also}>Also named: {question.competitorsNamed.join(', ')}</Text>}
            </View>
          );
        })}

        <View style={[s.card, { marginTop: 4 }]} wrap={false}>
          <Text style={{ fontSize: 10, color: c.muted }}>Ready to fix this? Get your fix plan at <Link src={`${reportUrl}#sr-fix`} style={{ color: c.blue }}>{reportUrl.replace(/^https?:\/\//, '')}</Link>.</Text>
        </View>
        {footer}
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.top}><Mark /><Text style={s.topRight}>Evidence-based action plan</Text></View>
        <Text style={s.label}>Your next steps</Text>
        <Text style={s.section}>What to publish and where to build presence</Text>
        <Text style={s.sub}>These recommendations are generated from the missed buyer questions and domains actually cited in this audit. No additional AI generation is used.</Text>

        <View style={[s.card, { marginBottom: 12 }]}>
          <Text style={s.label}>1 · Pages to create or improve</Text>
          {missedQuestions.length ? missedQuestions.map((question, index) => (
            <View key={question.id} style={{ paddingVertical: 8, borderBottomWidth: index === missedQuestions.length - 1 ? 0 : 0.6, borderBottomColor: c.line }}>
              <Text style={{ fontSize: 9, color: c.blue, fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>PRIORITY {index + 1}</Text>
              <Text style={{ fontSize: 10.5, fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>Create or improve a page answering:</Text>
              <Text style={{ fontSize: 9.5, lineHeight: 1.45 }}>“{question.question}”</Text>
              {question.competitorsNamed.length > 0 && <Text style={{ fontSize: 8.5, color: c.muted, marginTop: 4 }}>Competitors named in this answer: {question.competitorsNamed.join(', ')}</Text>}
              <Text style={{ fontSize: 8.5, color: c.muted, marginTop: 4 }}>Include verified service details, relevant use cases, proof such as case studies or certifications, and a clear enquiry route. If a suitable page already exists, improve it instead of creating a duplicate.</Text>
            </View>
          )) : <Text style={{ fontSize: 9, color: c.muted }}>No clear missed questions were recorded, so no new page is prescribed.</Text>}
        </View>

        <View style={s.card}>
          <Text style={s.label}>2 · Directory and profile opportunities</Text>
          {citedDirectories.length ? citedDirectories.map((source, index) => (
            <View key={source.domain} style={{ paddingVertical: 8, borderBottomWidth: index === citedDirectories.length - 1 ? 0 : 0.6, borderBottomColor: c.line }}>
              <Text style={{ fontSize: 10.5, fontFamily: 'Helvetica-Bold' }}>{source.domain}</Text>
              <Text style={{ fontSize: 8.8, color: c.muted, marginTop: 3 }}>Cited in {source.answers} audited answer{source.answers === 1 ? '' : 's'}. Check whether your business already has a complete profile; if not, verify eligibility and claim or create one.</Text>
            </View>
          )) : <Text style={{ fontSize: 9, color: c.muted }}>No known business directory was identified among the sources captured in this audit. BrandPulse will not invent a listing target. Re-check the source list after a future audit.</Text>}
        </View>

        <View style={{ marginTop: 12, padding: 10, backgroundColor: c.soft, borderRadius: 8 }}>
          <Text style={{ fontSize: 8, color: c.muted }}>Important: these are evidence-led recommendations, not confirmation that a page or listing is missing. Check the live website and profile first. Only publish verified business facts. AI visibility is not guaranteed.</Text>
        </View>
        {footer}
      </Page>

      {drafts.map((draft, index) => (
        <Page key={`draft-${index}`} size="A4" style={s.page}>
          <View style={s.top}><Mark /><Text style={s.topRight}>AI content recommendation {index + 1} of {drafts.length}</Text></View>
          <Text style={s.label}>Generated page draft · for review only</Text>
          <Text style={s.draftQuestion}>BASED ON THIS MISSED BUYER QUESTION</Text>
          <Text style={s.qText}>{draft.buyer_question || missedQuestions[index]?.question || 'Buyer question recorded in the audit'}</Text>
          <Text style={[s.draftTitle, { marginTop: 16 }]}>{draft.title}</Text>
          {draft.meta_description && <Text style={s.draftMeta}>SEO DESCRIPTION: {draft.meta_description} · {countDraftWords(draft.body)} words</Text>}
          <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 10 }}>
            {draftBlocks(draft.body).map((block, blockIndex) => (
              <Text key={blockIndex} style={block.kind === 'h2' ? s.draftH2 : block.kind === 'h3' ? s.draftH3 : block.kind === 'li' ? s.draftLi : s.draftP}>
                {block.kind === 'li' ? '- ' : ''}{block.text}
              </Text>
            ))}
          </View>
          <View style={s.draftNotice}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>How to use this draft</Text>
            <Text>Audit evidence: the buyer question above was recorded as a missed question in this report. Verified business facts: limited to the business profile saved in BrandPulse at generation time. General industry guidance: educational content, not a claim about this business. Any [VERIFY] note marks information that must be confirmed before use.</Text>
            <Text style={{ marginTop: 5 }}>This is an AI-generated draft for human review. It has not been published. Verify every service description, capability, certification, statistic and business-specific statement before publishing. BrandPulse does not guarantee AI visibility.</Text>
          </View>
          {footer}
        </Page>
      ))}
    </Document>
  );
}
