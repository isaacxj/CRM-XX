import { PageHeader } from "@/components/kit/page-header";
import { Skeleton } from "@/components/kit/skeleton";

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex flex-1 flex-col gap-6 p-4 md:p-8"
    >
      <PageHeader title="Today" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
