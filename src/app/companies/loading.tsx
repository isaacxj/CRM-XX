import { PageHeader } from "@/components/kit/page-header";
import { TableSkeleton } from "@/components/kit/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <PageHeader title="Companies" />
      <TableSkeleton />
    </div>
  );
}
