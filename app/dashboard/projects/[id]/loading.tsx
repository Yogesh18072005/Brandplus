import { Skeleton } from '@/components/ui/Skeleton';

export default function ProjectLoading() {
  return (
    <div aria-busy="true" aria-label="Loading report" className="flex flex-col gap-3">
      <Skeleton className="h-[300px] rounded-[24px]" />
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-[260px] rounded-[24px]" />
        <Skeleton className="h-[260px] rounded-[24px]" />
      </div>
      <Skeleton className="h-[420px] rounded-[24px]" />
    </div>
  );
}
