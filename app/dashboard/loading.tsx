import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-3 w-36" />
      <Skeleton className="mt-4 h-11 w-80 max-w-full" />
      <Skeleton className="mt-3 h-5 w-[34rem] max-w-full" />
      <div className="mt-10 grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
        <Skeleton className="h-[320px]" />
        <Skeleton className="h-[320px]" />
      </div>
      <Skeleton className="mt-10 h-7 w-40" />
      <Skeleton className="mt-5 h-72" />
    </div>
  );
}
