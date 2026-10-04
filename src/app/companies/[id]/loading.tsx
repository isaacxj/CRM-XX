import { Skeleton } from "@/components/kit/skeleton";

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex flex-1 flex-col gap-6 p-4 md:p-8"
    >
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
