import { CopyCommand } from '@/components/admin/CopyCommand';

export interface AuditRequestRow {
  id: string;
  businessName: string;
  website: string;
  requesterEmail: string | null;
  plan: string;
  credits: number | null;
  accountFlag: string | null;
  requestedAt: string;
  state: 'awaiting' | 'running';
  creditMode: 'charge' | 'free' | null;
}

const FLAG_LABEL: Record<string, string> = {
  network_used: 'Network already has an account',
  device_used: 'Device already has an account',
  blocked: 'Free audit blocked',
  pending: 'Account setup not finished',
};

function ago(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}

/**
 * Requests from signed-in users. Audits run longer than Vercel allows, so each
 * one is run from the founder's own terminal: charge one credit, or comp it.
 */
export function AuditRequests({ requests, unavailable }: { requests: AuditRequestRow[]; unavailable: string | null }) {
  const nextId = requests.find((request) => request.state === 'awaiting')?.id;
  return (
    <>
      <div className="zw-card-head">
        <div>
          <h2>Audit requests</h2>
          <p>Run each one from your terminal in the project folder. The report emails itself to the requester when it finishes.</p>
        </div>
      </div>
      {unavailable ? (
        <div className="zw-notice zw-notice-error" role="alert"><p>{unavailable}</p></div>
      ) : requests.length === 0 ? (
        <p className="zw-muted">No one is waiting. New requests land here and in your inbox.</p>
      ) : (
        <ul className="zw-requests">
          {requests.map((request) => (
            <li key={request.id} className={request.state === 'running' ? 'is-running' : ''}>
              <div className="zw-request-top">
                <div>
                  <strong>{request.businessName}</strong>
                  <span>{request.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                </div>
                <span className={`zw-badge is-${request.state === 'running' ? 'mentioned' : request.id === nextId ? 'recommended' : 'inconclusive'}`}>
                  {request.state === 'running' ? `running · ${request.creditMode ?? 'approved'}` : request.id === nextId ? 'next' : 'waiting'}
                </span>
              </div>
              <dl className="zw-request-facts">
                <div><dt>Requested by</dt><dd>{request.requesterEmail ? <a href={`mailto:${request.requesterEmail}`} className="zw-text-link">{request.requesterEmail}</a> : '—'}</dd></div>
                <div><dt>When</dt><dd title={new Date(request.requestedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}>{ago(request.requestedAt)}</dd></div>
                <div><dt>Plan · credits</dt><dd>{request.plan} · {request.credits ?? '—'} left</dd></div>
                {request.accountFlag && <div><dt>Flag</dt><dd className="is-flag">{FLAG_LABEL[request.accountFlag] ?? request.accountFlag}</dd></div>}
              </dl>
              {request.state === 'awaiting' ? (
                <div className="zw-cmds">
                  <CopyCommand label="Charge 1 credit" command={`npm run audit:run -- ${request.id} --charge --confirm`} />
                  <CopyCommand label="Run free" command={`npm run audit:run -- ${request.id} --free --confirm`} />
                </div>
              ) : (
                <div className="zw-cmds">
                  <CopyCommand label="Resume" command={`npm run audit:run -- ${request.id} --${request.creditMode === 'charge' ? 'charge' : 'free'} --confirm`} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
