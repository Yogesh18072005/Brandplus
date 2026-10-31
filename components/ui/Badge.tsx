type Status = 'active' | 'queued' | 'completed' | 'failed' | 'default';

const styles: Record<Status, string> = {
  active: 'bg-signal/10 text-signal border-signal/20',
  queued: 'bg-warning/10 text-warning border-warning/20',
  completed: 'bg-presence/10 text-presence border-presence/20',
  failed: 'bg-absence/10 text-absence border-absence/20',
  default: 'bg-surface-overlay text-secondary border-rule',
};

export function Badge({
  status = 'default',
  children,
  className = '',
}: {
  status?: Status;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${styles[status]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${
        status === 'active' ? 'animate-pulse bg-signal' :
        status === 'queued' ? 'bg-warning' :
        status === 'completed' ? 'bg-presence' :
        status === 'failed' ? 'bg-absence' : 'bg-muted'
      }`} />
      {children}
    </span>
  );
}
