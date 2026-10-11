import Link from "next/link";

import { DataTable, EmptyState, Td, Th, Tr } from "@/components/kit/data-table";
import { PageHeader } from "@/components/kit/page-header";
import { Button } from "@/components/ui/button";
import { BUSINESSES } from "@/server/db/schema";
import { getWorkload } from "@/server/db/workload";

const BUSINESS_LABEL = { statixx: "Statixx", trazo: "Trazo" } as const;

function Count({ value, overdue = 0 }: { value: number; overdue?: number }) {
  return (
    <span className="num">
      {value}
      {overdue > 0 ? (
        <span className="text-danger ml-1.5 text-xs">{overdue} overdue</span>
      ) : null}
    </span>
  );
}

export default async function WorkloadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const business = BUSINESSES.find((value) => value === params.business);
  const rows = await getWorkload(business);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Workload"
        description="What each person has on their plate: open follow-ups, emails waiting on a reply, meetings in the next 7 days, and what they logged in the last 7 days."
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="business" className="text-muted-foreground text-xs">
            Business
          </label>
          <select
            id="business"
            name="business"
            defaultValue={business ?? ""}
            className="border-border-strong bg-surface-raised text-foreground h-9 rounded-md border px-3 text-sm"
          >
            <option value="">All</option>
            {BUSINESSES.map((value) => (
              <option key={value} value={value}>
                {BUSINESS_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {business ? (
          <Link
            href="/workload"
            className="text-muted-foreground hover:text-foreground self-center text-sm hover:underline"
          >
            Clear filter
          </Link>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={
            business
              ? "Nothing is open or logged for this business. Clear the filter or add a follow-up on a company."
              : "Nothing is open or logged yet. Add a follow-up or log an activity on a company."
          }
          action={
            <Link
              href="/companies"
              className="text-accent text-sm font-medium hover:underline"
            >
              Go to companies
            </Link>
          }
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Owner</Th>
              <Th>Follow-ups</Th>
              <Th>Waiting on reply</Th>
              <Th>Meetings, next 7 days</Th>
              <Th className="text-right">Logged, last 7 days</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.ownerEmail ?? "unowned"}>
                <Td className="font-medium">
                  {row.ownerEmail ?? (
                    <span className="text-muted-foreground">No owner</span>
                  )}
                </Td>
                <Td>
                  <Count
                    value={row.openFollowUps}
                    overdue={row.overdueFollowUps}
                  />
                </Td>
                <Td>
                  <Count
                    value={row.waitingOnReply}
                    overdue={row.overdueReplies}
                  />
                </Td>
                <Td>
                  <Count value={row.meetingsNextWeek} />
                </Td>
                <Td className="text-right">
                  <Count value={row.loggedLastWeek} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
