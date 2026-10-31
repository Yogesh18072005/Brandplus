import { Skeleton } from '@/components/ui/Skeleton';

export default function OperationsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading operations">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-32" />)}
      </div>
      <Skeleton className="mt-8 h-40" />
      <Skeleton className="mt-8 h-80" />
    </div>
  );
}
