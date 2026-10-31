export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-surface-overlay ${className}`}
      aria-hidden="true"
    />
  );
}
