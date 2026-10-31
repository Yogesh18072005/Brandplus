import { Circle, Document, Link, Page, Path, Rect, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import type { CustomerOutcome, CustomerReportViewModel, ReportConfidence } from '@/lib/reports/report-view-model';

const colors = {
  ink: '#121026',
  secondary: '#565570',
  quiet: '#777791',
  bone: '#F6F7F4',
  paper: '#FFFFFF',
  rule: '#DCE1DE',
  blue: '#5235E0',
  bluePale: '#EFECFE',
  green: '#1F7A52',
  greenPale: '#E8F4EE',
  red: '#B93E3E',
  redPale: '#FBECEC',
  amber: '#8A5B00',
  amberPale: '#FFF4D8',
};

const styles = StyleSheet.create({
  page: { backgroundColor: colors.paper, color: colors.ink, fontFamily: 'Helvetica', fontSize: 9.5, lineHeight: 1.45, paddingTop: 48, paddingRight: 46, paddingBottom: 54, paddingLeft: 46 },
  header: { position: 'absolute', top: 20, left: 46, right: 46, flexDirection: 'row', justifyContent: 'space-between', color: colors.quiet, fontSize: 7.5, borderBottomWidth: 0.6, borderBottomColor: colors.rule, paddingBottom: 7 },
  footerLeft: { position: 'absolute', bottom: 24, left: 46, width: 260, color: colors.quiet, fontSize: 7.5 },
  coverTitle: { fontSize: 29, lineHeight: 1.06, fontFamily: 'Helvetica-Bold', letterSpacing: -0.7, marginTop: 20, maxWidth: 500 },
  website: { fontSize: 8, color: colors.blue, marginTop: 7 },
  coverMeta: { flexDirection: 'row', marginTop: 24, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.rule },
  coverMetaItem: { width: '33.333%', paddingRight: 12 },
  metaLabel: { fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.quiet, marginBottom: 3 },
  metaValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  verdict: { backgroundColor: colors.bone, marginTop: 28, padding: 22 },
  verdictText: { fontSize: 20, lineHeight: 1.2, fontFamily: 'Helvetica-Bold', letterSpacing: -0.3 },
  verdictNote: { color: colors.secondary, marginTop: 10, maxWidth: 430 },
  quality: { marginTop: 16, color: colors.blue, fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
  metricRow: { flexDirection: 'row', marginTop: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.rule },
  metric: { flexGrow: 1, flexBasis: 0, paddingTop: 13, paddingBottom: 13, borderRightWidth: 0.6, borderRightColor: colors.rule },
  metricLast: { borderRightWidth: 0 },
  metricValue: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: colors.ink },
  metricLabel: { fontSize: 7.2, color: colors.secondary, marginTop: 3, paddingRight: 6 },
  sectionTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', letterSpacing: -0.35, marginBottom: 7 },
  sectionIntro: { color: colors.secondary, maxWidth: 430, marginBottom: 18 },
  context: { flexDirection: 'row', marginTop: 22 },
  contextPrimary: { width: '43%', paddingRight: 20 },
  contextGrid: { width: '57%' },
  contextRow: { paddingTop: 7, paddingBottom: 7, borderBottomWidth: 0.6, borderBottomColor: colors.rule },
  contextValue: { marginTop: 2, fontFamily: 'Helvetica-Bold' },
  opportunity: { marginTop: 22, backgroundColor: colors.blue, color: '#FFFFFF', padding: 18 },
  opportunityTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 4 },
  smallCaps: { fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.8 },
  table: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.rule, marginBottom: 20 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.6, borderBottomColor: colors.rule, paddingTop: 8, paddingBottom: 8 },
  tableHead: { backgroundColor: colors.bone, fontFamily: 'Helvetica-Bold', color: colors.secondary },
  questionCol: { width: '45%', paddingRight: 10 },
  intentCol: { width: '18%', paddingRight: 8 },
  outcomeCol: { width: '20%', paddingRight: 8 },
  sourceCol: { width: '9%' },
  confidenceCol: { width: '8%' },
  evidenceCard: { borderTopWidth: 1.2, borderTopColor: colors.ink, paddingTop: 13, marginBottom: 22 },
  evidenceTop: { flexDirection: 'row', justifyContent: 'space-between' },
  evidenceQuestion: { fontFamily: 'Helvetica-Bold', fontSize: 12, lineHeight: 1.3, maxWidth: 390 },
  chip: { fontSize: 7.5, paddingTop: 4, paddingBottom: 4, paddingLeft: 7, paddingRight: 7, borderRadius: 3, alignSelf: 'flex-start' },
  answer: { marginTop: 10, backgroundColor: colors.bone, padding: 12 },
  answerMeta: { color: colors.quiet, fontSize: 7.5, marginBottom: 5 },
  answerText: { fontSize: 9.3, lineHeight: 1.5 },
  analysis: { flexDirection: 'row', marginTop: 10 },
  analysisCol: { width: '50%', paddingRight: 14 },
  analysisTitle: { fontFamily: 'Helvetica-Bold', fontSize: 8, marginBottom: 3 },
  citationList: { marginTop: 9, paddingTop: 8, borderTopWidth: 0.6, borderTopColor: colors.rule },
  citation: { marginBottom: 4 },
  citationLink: { color: colors.blue, textDecoration: 'none', fontSize: 8 },
  citationMeta: { color: colors.quiet, fontSize: 7 },
  action: { borderTopWidth: 1.2, borderTopColor: colors.ink, paddingTop: 13, marginBottom: 24 },
  actionHeader: { flexDirection: 'row' },
  actionNumber: { width: 42, fontSize: 20, fontFamily: 'Helvetica-Bold', color: colors.blue },
  actionBody: { flexGrow: 1, flexBasis: 0 },
  actionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', lineHeight: 1.25 },
  actionRationale: { color: colors.secondary, marginTop: 5 },
  actionFacts: { flexDirection: 'row', marginTop: 10, backgroundColor: colors.bone, padding: 9 },
  actionFact: { width: '25%', paddingRight: 8 },
  actionColumns: { flexDirection: 'row', marginTop: 12 },
  actionColumn: { width: '50%', paddingRight: 15 },
  listItem: { marginTop: 3, paddingLeft: 8 },
  validation: { marginTop: 9, backgroundColor: colors.amberPale, color: colors.amber, padding: 8, fontFamily: 'Helvetica-Bold' },
  compareRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.rule, marginTop: 14 },
  compare: { width: '25%', paddingTop: 13, paddingBottom: 13 },
  compareValue: { fontSize: 20, fontFamily: 'Helvetica-Bold' },
  compareLabel: { color: colors.secondary, fontSize: 7.5, marginTop: 2 },
  methodology: { flexDirection: 'row', marginTop: 22 },
  methodColumn: { width: '50%', paddingRight: 18 },
  methodRow: { marginTop: 7, paddingBottom: 7, borderBottomWidth: 0.6, borderBottomColor: colors.rule },
  limitation: { marginTop: 6, paddingLeft: 8 },
  preview: { marginTop: 20, backgroundColor: colors.bluePale, color: colors.ink, padding: 13 },
});

function formatDate(value: string | null): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function chipStyle(outcome: CustomerOutcome) {
  if (outcome === 'RECOMMENDED') return [styles.chip, { backgroundColor: colors.greenPale, color: colors.green }];
  if (outcome === 'MENTIONED') return [styles.chip, { backgroundColor: colors.bluePale, color: colors.blue }];
  if (outcome === 'NOT_MENTIONED') return [styles.chip, { backgroundColor: colors.redPale, color: colors.red }];
  return [styles.chip, { backgroundColor: colors.bone, color: colors.secondary }];
}

function outcomeLabel(outcome: CustomerOutcome): string {
  return outcome.toLowerCase().replaceAll('_', ' ').replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

function confidenceLabel(value: ReportConfidence): string {
  return value.toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

/** The BrandPulse mark for PDF headers (react-pdf cannot use the web SVG component). */
function PdfBrand() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Svg viewBox="4 4 56 56" style={{ width: 9, height: 9, marginRight: 4 }}>
        <Rect x={4} y={4} width={56} height={56} rx={16} fill="#463EDA" />
        <Path d="M13 34h8.5l5.5-13 9.5 23 5.5-12h4.5" stroke="#FFFFFF" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Circle cx={51.5} cy={32} r={4.2} fill="#1FC58A" />
      </Svg>
      <Text>brandpulse · AI visibility assessment</Text>
    </View>
  );
}

export function ReportPdfDocument({ model, full }: { model: CustomerReportViewModel; full: boolean }) {
  const detailedEvidence = model.kind === 'LEGACY'
    ? model.evidence.filter((item) => item.excerpt || item.citations.length > 0).slice(0, 4)
    : model.evidence;
  return (
    <Document title={`${model.business.name} - BrandPulse AI visibility assessment`} author="BrandPulse" subject="Evidence-linked AI visibility assessment" language="en-IN">
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed><Text>{model.business.name}</Text><PdfBrand /></View>
        <Text style={styles.footerLeft} fixed>Confidential - observed {formatDate(model.observationDate)}</Text>
        <Text style={styles.coverTitle}>{model.business.name} - AI visibility assessment</Text>
        <Text style={styles.website}>{model.business.website}</Text>
        <View style={styles.coverMeta}>
          <View style={styles.coverMetaItem}><Text style={styles.metaLabel}>Observed</Text><Text style={styles.metaValue}>{formatDate(model.observationDate)}</Text></View>
          <View style={styles.coverMetaItem}><Text style={styles.metaLabel}>Provider</Text><Text style={styles.metaValue}>{model.scope.provider}</Text></View>
          <View style={styles.coverMetaItem}><Text style={styles.metaLabel}>Model</Text><Text style={styles.metaValue}>{model.scope.model}</Text></View>
        </View>
        <View style={styles.verdict}>
          <Text style={styles.verdictText}>{model.verdict}</Text>
          <Text style={styles.verdictNote}>This conclusion is limited to the recorded provider, model, date, and frozen buyer-question set shown in this report.</Text>
          <Text style={styles.quality}>Data quality: {model.scope.dataQuality.replaceAll('_', ' ').toLowerCase()}</Text>
        </View>
        <View style={styles.metricRow}>
          {[
            [model.outcomes.meaningfulAppearances, 'meaningful appearances'],
            [model.outcomes.recommended, 'recommended'],
            [model.outcomes.mentioned, 'mentioned only'],
            [model.outcomes.notMentioned, 'not mentioned'],
            [model.outcomes.inconclusive, 'inconclusive'],
          ].map(([value, label], index, values) => <View key={label} style={[styles.metric, index === values.length - 1 ? styles.metricLast : {}]}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>)}
        </View>
        <View style={styles.context}>
          <View style={styles.contextPrimary}><Text style={styles.metaLabel}>Business context used</Text><Text>{model.business.description ?? 'No verified business description was retained.'}</Text></View>
          <View style={styles.contextGrid}>
            <View style={styles.contextRow}><Text style={styles.metaLabel}>Products or services</Text><Text style={styles.contextValue}>{model.business.products.join(', ') || 'Not recorded'}</Text></View>
            <View style={styles.contextRow}><Text style={styles.metaLabel}>Buyer types</Text><Text style={styles.contextValue}>{model.business.buyers.join(', ') || 'Not recorded'}</Text></View>
            <View style={styles.contextRow}><Text style={styles.metaLabel}>Target markets</Text><Text style={styles.contextValue}>{model.business.markets.join(', ') || 'Not recorded'}</Text></View>
            <View style={styles.contextRow}><Text style={styles.metaLabel}>Observation coverage</Text><Text style={styles.contextValue}>{model.scope.completedQuestions} usable; {model.scope.failedQuestions} inconclusive or failed</Text></View>
          </View>
        </View>
        <View style={styles.opportunity}><Text style={styles.smallCaps}>Highest-priority next move</Text><Text style={styles.opportunityTitle}>{model.topOpportunity}</Text></View>
        {!full && <View style={styles.preview}><Text style={{ fontFamily: 'Helvetica-Bold' }}>Preview report</Text><Text style={{ marginTop: 4 }}>This PDF includes one connected evidence example and one action preview. The paid report adds the complete question set, evidence, action plan, and retained comparison history.</Text></View>}
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed><Text>{model.business.name}</Text><PdfBrand /></View>
        <Text style={styles.footerLeft} fixed>Confidential - observed {formatDate(model.observationDate)}</Text>
        <View style={styles.header}><Text>{model.business.name}</Text><PdfBrand /></View>
        <Text style={styles.footerLeft}>Confidential - observed {formatDate(model.observationDate)}</Text>
        <Text style={styles.sectionTitle}>Evidence behind the result</Text>
        <Text style={styles.sectionIntro}>Each finding keeps the buyer question, answer excerpt, entities, citations, diagnosis, and related work together.</Text>
        {model.evidence.length ? (
          <>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHead]} fixed><Text style={styles.questionCol}>Buyer question</Text><Text style={styles.intentCol}>Intent</Text><Text style={styles.outcomeCol}>Outcome</Text><Text style={styles.sourceCol}>Sources</Text><Text style={styles.confidenceCol}>Conf.</Text></View>
              {model.evidence.map((item) => <View key={item.id} style={styles.tableRow} wrap={false}><Text style={styles.questionCol}>{item.question}</Text><Text style={styles.intentCol}>{item.intent}</Text><Text style={styles.outcomeCol}>{outcomeLabel(item.outcome)}</Text><Text style={styles.sourceCol}>{item.citations.length}</Text><Text style={styles.confidenceCol}>{confidenceLabel(item.confidence)}</Text></View>)}
            </View>
            {model.sources.length ? (
              <View style={[styles.table, { marginTop: 4 }]}>
                <Text style={[styles.analysisTitle, { paddingTop: 8, paddingBottom: 6 }]}>Observed source landscape</Text>
                {model.sources.slice(0, 10).map((source) => (
                  <View key={source.id} style={styles.tableRow} wrap={false}>
                    <Text style={{ width: '50%', paddingRight: 8 }}>{source.domain}</Text>
                    <Text style={{ width: '35%', paddingRight: 8, color: colors.secondary }}>{source.role}</Text>
                    <Text style={{ width: '15%', textAlign: 'right' }}>{source.observedCount}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {model.kind === 'LEGACY' && detailedEvidence.length < model.evidence.length ? (
              <Text style={[styles.sectionIntro, { marginBottom: 14 }]}>Detailed cards are limited to questions with retained answer or citation evidence. The matrix above preserves every recorded question outcome.</Text>
            ) : null}
            {detailedEvidence.map((item, index) => (
              <View key={item.id} style={styles.evidenceCard} wrap={false}>
                <View style={styles.evidenceTop}><Text style={styles.evidenceQuestion}>{index + 1}. {item.question}</Text><Text style={chipStyle(item.outcome)}>{outcomeLabel(item.outcome)}</Text></View>
                <Text style={styles.answerMeta}>{item.buyerStage} / {item.intent} / {item.provider} / {item.model}</Text>
                <View style={styles.answer}><Text style={styles.answerMeta}>Recorded answer excerpt</Text><Text style={styles.answerText}>{item.excerpt ?? 'No usable answer excerpt was retained for this question.'}</Text></View>
                <View style={styles.analysis}>
                  <View style={styles.analysisCol}><Text style={styles.analysisTitle}>Observed fact</Text><Text>{item.observedEntities.length ? `Other named entities: ${item.observedEntities.join(', ')}.` : 'No other named entity was reliably extracted.'}</Text></View>
                  <View style={styles.analysisCol}><Text style={styles.analysisTitle}>Diagnosis and gap</Text><Text>{item.diagnosis ?? 'No defensible diagnosis was finalized.'} {item.diagnosedGap ?? ''}</Text></View>
                </View>
                {item.citations.length ? <View style={styles.citationList}><Text style={styles.analysisTitle}>Citations</Text>{item.citations.map((citation) => <View key={citation.id} style={styles.citation}>{citation.url ? <Link style={styles.citationLink} src={citation.url}>{citation.title}</Link> : <Text style={styles.citationLink}>{citation.title}</Text>}<Text style={styles.citationMeta}>{citation.role} - {citation.domain}</Text></View>)}</View> : null}
              </View>
            ))}
          </>
        ) : <View style={styles.verdict}><Text style={{ fontFamily: 'Helvetica-Bold' }}>Question-level evidence is unavailable.</Text><Text style={{ marginTop: 5 }}>This historical summary cannot support a specific diagnosis. Run a new canonical observation before choosing an intervention.</Text></View>}
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed><Text>{model.business.name}</Text><PdfBrand /></View>
        <Text style={styles.footerLeft} fixed>Confidential - observed {formatDate(model.observationDate)}</Text>
        <View style={styles.header}><Text>{model.business.name}</Text><PdfBrand /></View>
        <Text style={styles.footerLeft}>Confidential - observed {formatDate(model.observationDate)}</Text>
        <Text style={styles.sectionTitle}>Prioritized action plan</Text>
        <Text style={styles.sectionIntro}>Only finalized or evidence-linked work appears here. Generic foundations are not promoted without validation.</Text>
        {model.actions.length ? model.actions.map((action, index) => (
          <View key={action.id} style={styles.action} wrap={false}>
            <View style={styles.actionHeader}><Text style={styles.actionNumber}>{String(index + 1).padStart(2, '0')}</Text><View style={styles.actionBody}><Text style={styles.actionTitle}>{action.title}</Text><Text style={styles.actionRationale}>{action.rationale}</Text></View></View>
            {action.needsValidation ? <Text style={styles.validation}>Validate required business facts or the current implementation before publishing.</Text> : null}
            <View style={styles.actionFacts}>
              <View style={styles.actionFact}><Text style={styles.metaLabel}>Owner</Text><Text>{action.owner}</Text></View>
              <View style={styles.actionFact}><Text style={styles.metaLabel}>Effort</Text><Text>{action.effort}</Text></View>
              <View style={styles.actionFact}><Text style={styles.metaLabel}>Impact</Text><Text>{action.impact}</Text></View>
              <View style={styles.actionFact}><Text style={styles.metaLabel}>Confidence</Text><Text>{confidenceLabel(action.confidence)}</Text></View>
            </View>
            <View style={styles.actionColumns}>
              <View style={styles.actionColumn}><Text style={styles.analysisTitle}>Verified gap</Text><Text>{action.diagnosedGap}</Text><Text style={[styles.analysisTitle, { marginTop: 8 }]}>Affected questions</Text>{action.questions.length ? action.questions.map((question) => <Text key={question.id} style={styles.listItem}>- {question.text}</Text>) : <Text>No exact question was linked.</Text>}</View>
              <View style={styles.actionColumn}><Text style={styles.analysisTitle}>Deliverable</Text><Text>{action.deliverable}</Text><Text style={[styles.analysisTitle, { marginTop: 8 }]}>Done when</Text>{action.acceptanceCriteria.length ? action.acceptanceCriteria.map((criterion) => <Text key={criterion} style={styles.listItem}>- {criterion}</Text>) : <Text>Completion criteria were not recorded.</Text>}</View>
            </View>
          </View>
        )) : <View style={styles.verdict}><Text style={{ fontFamily: 'Helvetica-Bold' }}>No intervention is sufficiently supported yet.</Text><Text style={{ marginTop: 5 }}>Complete or repeat evidence capture before prescribing a website, profile, directory, or structured-data change.</Text></View>}
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed><Text>{model.business.name}</Text><PdfBrand /></View>
        <Text style={styles.footerLeft} fixed>Confidential - observed {formatDate(model.observationDate)}</Text>
        <Text style={styles.sectionTitle}>Implementation and recheck</Text>
        <Text style={styles.sectionIntro}>Compare only like-for-like questions under recorded conditions. A changed answer is an observation, not automatic proof of causality.</Text>
        <View style={styles.compareRow}>
          <View style={styles.compare}><Text style={styles.compareValue}>{model.comparison.comparableQuestions}</Text><Text style={styles.compareLabel}>comparable</Text></View>
          <View style={styles.compare}><Text style={styles.compareValue}>{model.comparison.improved}</Text><Text style={styles.compareLabel}>improved</Text></View>
          <View style={styles.compare}><Text style={styles.compareValue}>{model.comparison.declined}</Text><Text style={styles.compareLabel}>declined</Text></View>
          <View style={styles.compare}><Text style={styles.compareValue}>{model.comparison.unchanged}</Text><Text style={styles.compareLabel}>unchanged</Text></View>
        </View>
        <Text style={{ marginTop: 12, color: colors.secondary }}>{model.comparison.statement}</Text>
        <View style={styles.methodology}>
          <View style={styles.methodColumn}>
            <Text style={styles.sectionTitle}>Measurement scope</Text>
            <View style={styles.methodRow}><Text style={styles.metaLabel}>Provider and model</Text><Text>{model.scope.provider} / {model.scope.model}</Text></View>
            <View style={styles.methodRow}><Text style={styles.metaLabel}>Locale and language</Text><Text>{model.scope.locale} / {model.scope.language}</Text></View>
            <View style={styles.methodRow}><Text style={styles.metaLabel}>Question set</Text><Text>{model.scope.requestedQuestions} frozen buyer questions</Text></View>
            <View style={styles.methodRow}><Text style={styles.metaLabel}>Coverage</Text><Text>{model.scope.completedQuestions} usable; {model.scope.failedQuestions} inconclusive or failed</Text></View>
          </View>
          <View style={styles.methodColumn}>
            <Text style={styles.sectionTitle}>Limitations</Text>
            {model.limitations.map((limitation) => <Text key={limitation} style={styles.limitation}>- {limitation}</Text>)}
          </View>
        </View>
        <View style={[styles.verdict, { marginTop: 26 }]}>
          <Text style={styles.metaLabel}>Next measurement</Text>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 13, marginTop: 5 }}>Publish approved work, record the live URL and date, then repeat the affected questions under the same recorded conditions.</Text>
        </View>
        <Text style={{ marginTop: 24, color: colors.quiet, fontSize: 7.5 }}>Technical reference: {model.technicalReference}</Text>
      </Page>
    </Document>
  );
}

