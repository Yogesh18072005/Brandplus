import Link from 'next/link';
import { PrintButton } from '@/components/PrintButton';
import { ReportWordmark } from '@/components/brand/ReportWordmark';
import { ReportNavigation } from '@/components/report/ReportInteractions';
import type { CustomerOutcome, CustomerReportViewModel, ReportActionView, ReportConfidence, ReportEvidenceView } from '@/lib/reports/report-view-model';

const outcomeLabel: Record<CustomerOutcome, string> = {
  RECOMMENDED: 'Recommended',
  MENTIONED: 'Mentioned',
  NOT_MENTIONED: 'Not mentioned',
  INCONCLUSIVE: 'Inconclusive',
};

const outcomeClass: Record<CustomerOutcome, string> = {
  RECOMMENDED: 'report-v2-status report-v2-status-positive',
  MENTIONED: 'report-v2-status report-v2-status-neutral',
  NOT_MENTIONED: 'report-v2-status report-v2-status-negative',
  INCONCLUSIVE: 'report-v2-status report-v2-status-muted',
};

const confidenceClass: Record<ReportConfidence, string> = {
  HIGH: 'report-v2-confidence report-v2-confidence-high',
  MEDIUM: 'report-v2-confidence report-v2-confidence-medium',
  LOW: 'report-v2-confidence report-v2-confidence-low',
  UNKNOWN: 'report-v2-confidence report-v2-confidence-unknown',
};

function formatDate(value: string | null): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function outcomeDescription(outcome: CustomerOutcome): string {
  if (outcome === 'RECOMMENDED') return 'The target was recommended or strongly recommended.';
  if (outcome === 'MENTIONED') return 'The target appeared, but was not recorded as a recommendation.';
  if (outcome === 'NOT_MENTIONED') return 'The target was absent from the usable response.';
  return 'The response could not support a reliable conclusion.';
}

function Metric({ label, value, emphasis = false }: { label: string; value: number | string; emphasis?: boolean }) {
  return (
    <div className={`report-v2-metric ${emphasis ? 'report-v2-metric-emphasis' : ''}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function EvidenceCard({ item, index }: { item: ReportEvidenceView; index: number }) {
  return (
    <article className="report-v2-evidence-card">
      <div className="report-v2-evidence-heading">
        <div>
          <span className="report-v2-index">Question {index + 1}</span>
          <h3>{item.question}</h3>
        </div>
        <span className={outcomeClass[item.outcome]}>{outcomeLabel[item.outcome]}</span>
      </div>

      <dl className="report-v2-evidence-meta">
        <div><dt>Buyer stage</dt><dd>{item.buyerStage}</dd></div>
        <div><dt>Intent</dt><dd>{item.intent}</dd></div>
        <div><dt>Observed with</dt><dd>{item.provider} / {item.model}</dd></div>
        <div><dt>Confidence</dt><dd><span className={confidenceClass[item.confidence]}>{item.confidence.toLowerCase()}</span></dd></div>
      </dl>

      <div className="report-v2-answer">
        <div className="report-v2-answer-topline">
          <span>Recorded answer excerpt</span>
          <span>{item.observedAt ? formatDate(item.observedAt) : item.completeness}</span>
        </div>
        <p>{item.excerpt ?? 'No usable answer excerpt was retained for this question.'}</p>
        <div className="report-v2-target-strip">Outcome: {outcomeDescription(item.outcome)}</div>
      </div>

      <div className="report-v2-analysis-grid">
        <div>
          <h4>Observed fact</h4>
          <p>{item.observedEntities.length ? `Other named entities: ${item.observedEntities.join(', ')}.` : 'No other named entity was reliably extracted.'}</p>
        </div>
        <div>
          <h4>Diagnosis</h4>
          <p>{item.diagnosis ?? 'No defensible diagnosis was finalized for this question.'}</p>
        </div>
        <div>
          <h4>Evidence gap</h4>
          <p>{item.diagnosedGap ?? 'No specific evidence gap was verified.'}</p>
        </div>
      </div>

      <details className="report-v2-details">
        <summary>Inspect citations and provenance</summary>
        {item.citations.length ? (
          <ul>
            {item.citations.map((citation) => (
              <li key={citation.id}>
                {citation.url ? <a href={citation.url} target="_blank" rel="noreferrer">{citation.title}</a> : <span>{citation.title}</span>}
                <small>{citation.role} · {citation.domain}{citation.context ? ` · ${citation.context}` : ''}</small>
              </li>
            ))}
          </ul>
        ) : <p>No citation metadata was retained for this answer.</p>}
      </details>
    </article>
  );
}

function ActionCard({ action, index, projectId }: { action: ReportActionView; index: number; projectId: string | null }) {
  return (
    <article className="report-v2-action">
      <div className="report-v2-action-number">{String(index + 1).padStart(2, '0')}</div>
      <div className="report-v2-action-body">
        <div className="report-v2-action-heading">
          <div>
            <h3>{action.title}</h3>
            <p>{action.rationale}</p>
          </div>
          <span className={confidenceClass[action.confidence]}>{action.confidence.toLowerCase()} confidence</span>
        </div>

        {action.needsValidation && (
          <p className="report-v2-validation">Validate the required business facts or current implementation before publishing this change.</p>
        )}

        <dl className="report-v2-action-facts">
          <div><dt>Owner</dt><dd>{action.owner}</dd></div>
          <div><dt>Effort</dt><dd>{action.effort} · {action.estimatedTime}</dd></div>
          <div><dt>Impact</dt><dd>{action.impact}</dd></div>
          <div><dt>Status</dt><dd>{action.executionStatus}</dd></div>
        </dl>

        <div className="report-v2-action-columns">
          <div>
            <h4>Verified gap</h4>
            <p>{action.diagnosedGap}</p>
            <h4>Affected buyer questions</h4>
            {action.questions.length ? <ul>{action.questions.map((question) => <li key={question.id}>{question.text}</li>)}</ul> : <p>No exact question was linked. Validate this task before using it.</p>}
          </div>
          <div>
            <h4>Deliverable</h4>
            <p>{action.deliverable}</p>
            <h4>Required inputs</h4>
            {action.requiredInputs.length ? <ul>{action.requiredInputs.map((input) => <li key={input}>{input}</li>)}</ul> : <p>No additional input was recorded.</p>}
          </div>
        </div>

        <div className="report-v2-acceptance">
          <div>
            <h4>Done when</h4>
            {action.acceptanceCriteria.length ? <ul>{action.acceptanceCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul> : <p>Completion criteria were not recorded.</p>}
          </div>
          <div>
            <h4>Recheck</h4>
            {action.measurement.length ? <ul>{action.measurement.map((measurement) => <li key={measurement}>{measurement}</li>)}</ul> : <p>Repeat the affected buyer questions under the same conditions.</p>}
          </div>
        </div>

        {projectId && (
          <Link className="report-v2-text-link print:hidden" href={`/dashboard/projects/${projectId}/executions`}>Open this work in the execution workspace</Link>
        )}
      </div>
    </article>
  );
}

function PreviewGate() {
  return (
    <aside className="report-v2-preview print:hidden">
      <div>
        <h3>One complete evidence chain is included in this preview.</h3>
        <p>The full report has every buyer question, every recorded answer, and the complete fix plan. We walk you through it and can do the fixes for you.</p>
      </div>
      <Link href="/sprint">See how we fix this</Link>
    </aside>
  );
}

export function DecisionReport({ model, full }: { model: CustomerReportViewModel; full: boolean }) {
  const navigation = [
    { id: 'report-overview', label: 'Result' },
    { id: 'report-evidence', label: 'Evidence' },
    { id: 'report-actions', label: 'Action plan' },
    { id: 'report-recheck', label: 'Recheck' },
  ];
  return (
    <div className="print-report report-v2">
      <header className="report-v2-appbar print:hidden">
        <Link href="/" aria-label="BrandPulse home"><ReportWordmark /></Link>
        <div>
          <span>{model.kind === 'LEGACY' ? 'Historical compatibility report' : full ? 'Complete evidence report' : 'Report preview'}</span>
          <PrintButton reportId={model.reportId} />
        </div>
      </header>

      <main className="report-v2-shell">
        <header className="report-v2-cover">
          <div className="report-v2-cover-title">
            <p>{model.business.website}</p>
            <h1>{model.business.name} - AI visibility assessment</h1>
          </div>
          <dl>
            <div><dt>Observed</dt><dd>{formatDate(model.observationDate)}</dd></div>
            <div><dt>Provider</dt><dd>{model.scope.provider}</dd></div>
            <div><dt>Model</dt><dd>{model.scope.model}</dd></div>
          </dl>
        </header>

        <ReportNavigation items={navigation} />

        <section id="report-overview" data-report-section className="report-v2-section report-v2-overview">
          <div className="report-v2-verdict">
            <div>
              <h2>{model.verdict}</h2>
              <p>This conclusion is limited to the recorded provider, model, date, and frozen buyer-question set shown in this report.</p>
            </div>
            <div className={`report-v2-quality report-v2-quality-${model.scope.dataQuality.toLowerCase()}`}>
              <span>Data quality</span>
              <strong>{model.scope.dataQuality.replaceAll('_', ' ').toLowerCase()}</strong>
            </div>
          </div>

          <div className="report-v2-metrics" aria-label="Observed outcomes">
            <Metric label={`meaningful appearances of ${model.scope.requestedQuestions}`} value={model.outcomes.meaningfulAppearances} emphasis />
            <Metric label="recommended" value={model.outcomes.recommended} />
            <Metric label="mentioned only" value={model.outcomes.mentioned} />
            <Metric label="not mentioned" value={model.outcomes.notMentioned} />
            <Metric label="inconclusive" value={model.outcomes.inconclusive} />
          </div>

          <div className="report-v2-context">
            <div>
              <h3>Business context used</h3>
              <p>{model.business.description ?? 'No verified business description was retained in this report.'}</p>
            </div>
            <dl>
              <div><dt>Products or services</dt><dd>{model.business.products.length ? model.business.products.join(', ') : 'Not recorded'}</dd></div>
              <div><dt>Buyer types</dt><dd>{model.business.buyers.length ? model.business.buyers.join(', ') : 'Not recorded'}</dd></div>
              <div><dt>Target markets</dt><dd>{model.business.markets.length ? model.business.markets.join(', ') : 'Not recorded'}</dd></div>
              <div><dt>Observation coverage</dt><dd>{model.scope.completedQuestions} usable · {model.scope.failedQuestions} inconclusive or failed</dd></div>
            </dl>
          </div>

          <div className="report-v2-opportunity">
            <span>Highest-priority next move</span>
            <strong>{model.topOpportunity}</strong>
            <a href="#report-actions">Review the evidence-backed action</a>
          </div>
        </section>

        {!full && <PreviewGate />}

        <section id="report-evidence" data-report-section className="report-v2-section">
          <div className="report-v2-section-heading">
            <div><h2>Evidence behind the result</h2><p>Each finding keeps the buyer question, recorded answer, entities, citations, diagnosis, and related work together.</p></div>
            <span>{model.evidence.length} question{model.evidence.length === 1 ? '' : 's'} shown</span>
          </div>

          {model.evidence.length ? (
            <>
              <div className="report-v2-table-wrap">
                <table className="report-v2-question-table">
                  <thead><tr><th>Buyer question</th><th>Intent</th><th>Outcome</th><th>Sources</th><th>Confidence</th></tr></thead>
                  <tbody>{model.evidence.map((item) => (
                    <tr key={item.id}>
                      <td>{item.question}</td><td>{item.intent}</td><td><span className={outcomeClass[item.outcome]}>{outcomeLabel[item.outcome]}</span></td>
                      <td>{item.citations.length}</td><td>{item.confidence.toLowerCase()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="report-v2-evidence-list">{model.evidence.map((item, index) => <EvidenceCard key={item.id} item={item} index={index} />)}</div>
            </>
          ) : (
            <div className="report-v2-empty">
              <h3>The historical record does not contain question-level evidence.</h3>
              <p>Do not infer a diagnosis from the domain list alone. Run a new canonical observation to capture the buyer questions, answer excerpts, entities, and citations required for a defensible recommendation.</p>
            </div>
          )}

          <div className="report-v2-sources">
            <div className="report-v2-section-heading compact"><div><h3>Source landscape</h3><p>Sources are grouped by their role and linked back to recorded questions when that relationship exists.</p></div></div>
            {model.sources.length ? <ul>{model.sources.map((source) => (
              <li key={source.id}>
                <div>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : <strong>{source.title}</strong>}<span>{source.domain}</span></div>
                <div><span>{source.role}</span><strong>{source.observedCount} observation{source.observedCount === 1 ? '' : 's'}</strong></div>
              </li>
            ))}</ul> : <p className="report-v2-empty-inline">No source metadata was retained.</p>}
          </div>
        </section>

        <section id="report-actions" data-report-section className="report-v2-section">
          <div className="report-v2-section-heading">
            <div><h2>Prioritized action plan</h2><p>Only finalized or evidence-linked work appears here. Generic foundations are not promoted as priority actions without validation.</p></div>
            <span>{model.actions.length} defensible action{model.actions.length === 1 ? '' : 's'}</span>
          </div>
          {model.actions.length ? <div className="report-v2-action-list">{model.actions.map((action, index) => <ActionCard key={action.id} action={action} index={index} projectId={model.projectId} />)}</div> : (
            <div className="report-v2-empty"><h3>No intervention is sufficiently supported yet.</h3><p>Complete or repeat the evidence capture before prescribing a website, directory, profile, or structured-data change.</p></div>
          )}
        </section>

        <section id="report-recheck" data-report-section className="report-v2-section report-v2-recheck">
          <div className="report-v2-section-heading">
            <div><h2>Implementation and recheck</h2><p>Compare only like-for-like questions under recorded conditions. A changed answer is an observation, not automatic proof of causality.</p></div>
          </div>
          <div className="report-v2-comparison">
            <div><span>{model.comparison.kind === 'BASELINE' ? 'Baseline' : 'Previous comparison'}</span><strong>{model.comparison.comparableQuestions}</strong><small>comparable questions</small></div>
            <div><span>Improved</span><strong>{model.comparison.improved}</strong></div>
            <div><span>Declined</span><strong>{model.comparison.declined}</strong></div>
            <div><span>Unchanged</span><strong>{model.comparison.unchanged}</strong></div>
          </div>
          <p className="report-v2-comparison-note">{model.comparison.statement}</p>

          <div className="report-v2-methodology">
            <div>
              <h3>Measurement scope</h3>
              <dl>
                <div><dt>Provider and model</dt><dd>{model.scope.provider} / {model.scope.model}</dd></div>
                <div><dt>Locale and language</dt><dd>{model.scope.locale} / {model.scope.language}</dd></div>
                <div><dt>Question set</dt><dd>{model.scope.requestedQuestions} frozen buyer questions</dd></div>
                <div><dt>Coverage</dt><dd>{model.scope.completedQuestions} usable, {model.scope.failedQuestions} inconclusive or failed</dd></div>
              </dl>
            </div>
            <div>
              <h3>Limitations</h3>
              <ul>{model.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
            </div>
          </div>

          <details className="report-v2-technical">
            <summary>Technical audit reference</summary>
            <p>{model.technicalReference}</p>
          </details>

          <div className="report-v2-next print:hidden">
            <div><h3>Turn the report into completed work.</h3><p>Confirm business facts, publish the approved deliverable, record the live URL, and schedule the same buyer questions for re-observation.</p></div>
            <div>{model.projectId ? <Link href={`/dashboard/projects/${model.projectId}/executions`}>Open execution workspace</Link> : <Link href="/dashboard">Return to workspace</Link>}<PrintButton reportId={model.reportId} /></div>
          </div>
        </section>

        <footer className="report-v2-footer">
          <span>BrandPulse AI visibility assessment</span>
          <span>{model.business.name}</span>
          <span>Observed {formatDate(model.observationDate)}</span>
        </footer>
      </main>
    </div>
  );
}

