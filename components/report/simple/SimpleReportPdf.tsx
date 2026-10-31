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
});

const VERDICT: Record<SimpleVerdict, { label: string; color: string; bg: string }> = {
  recommended: { label: 'Recommended you', color: c.mintDeep, bg: '#E3F3EC' },
  mentioned: { label: 'Mentioned you', color: c.mintDeep, bg: '#E3F3EC' },
  missed: { label: 'Not mentioned', color: c.coral, bg: c.coralSoft },
  unclear: { label: 'Unclear', color: c.muted, bg: c.soft },
};

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

export function SimpleReportPdf({ model, reportUrl }: { model: SimpleReport; reportUrl: string }) {
  const named = model.recommended + model.mentioned;
  const date = formatDate(model.observedOn);
  const maxSource = Math.max(1, ...model.sources.map((source) => source.answers));
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
    </Document>
  );
}
