import Link from "next/link";

import { formatCents } from "@/components/deal-shared";
import { DataTable, EmptyState, Td, Th, Tr } from "@/components/kit/data-table";
import { PageHeader } from "@/components/kit/page-header";
import { StatCard } from "@/components/kit/stat-card";
import { Button } from "@/components/ui/button";
import { ACTIVITY_TYPE_LABEL } from "@/lib/activity";
import {
  getReview,
  REVIEW_PERIODS,
  type ReviewDeal,
  type ReviewPeriod,
} from "@/server/db/review";
import { ACTIVITY_TYPES, BUSINESSES } from "@/server/db/schema";

const BUSINESS_LABEL = { statixx: "Statixx", trazo: "Trazo" } as const;

function dealValue(deal: ReviewDeal) {
  return deal.billing === "monthly"
    ? `${formatCents(deal.amountCents)}/mo`
    : formatCents(deal.amountCents);
}

function DealTable({
  deals,
  outcome,
}: {
  deals: ReviewDeal[];
  outcome: "won" | "lost";
}) {
  return (
    <DataTable>
      <thead>
        <tr>
          <Th>Deal</Th>
          <Th>Company</Th>
          <Th>{outcome === "lost" ? "Reason" : "Business"}</Th>
          <Th className="text-right">Value</Th>
        </tr>
      </thead>
      <tbody>
        {deals.map((deal) => (
          <Tr key={deal.dealId}>
            <Td className="font-medium">{deal.title}</Td>
            <Td>
              <Link
                href={`/companies/${deal.companyId}`}
                className="hover:underline"
              >
                {deal.companyName}
              </Link>
            </Td>
            <Td className="text-muted-foreground">
              {outcome === "lost"
                ? (deal.lostReason ?? "No reason recorded")
                : BUSINESS_LABEL[deal.business]}
            </Td>
            <Td className="num text-right">{dealValue(deal)}</Td>
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const business = BUSINESSES.find((value) => value === params.business);
  const days: ReviewPeriod =
    REVIEW_PERIODS.find((value) => String(value) === params.days) ?? 7;
  const review = await getReview(days, business);

  const logged = ACTIVITY_TYPES.reduce(
    (sum, type) => sum + review.activityByType[type],
    0,
  );
  const wonTotal = review.won.reduce((sum, d) => sum + d.amountCents, 0);
  const lostTotal = review.lost.reduce((sum, d) => sum + d.amountCents, 0);
  const empty =
    logged +
      review.newCompanies.length +
      review.newDeals +
      review.won.length +
      review.lost.length +
      review.followUpsDone.length ===
    0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Review"
        description={`What happened in the last ${days} days: companies added, deals won and lost, what you logged, and follow-ups finished.`}
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="days" className="text-muted-foreground text-xs">
            Period
          </label>
          <select
            id="days"
            name="days"
            defaultValue={String(days)}
            className="border-border-strong bg-surface-raised text-foreground h-9 rounded-md border px-3 text-sm"
          >
            {REVIEW_PERIODS.map((value) => (
              <option key={value} value={value}>
                Last {value} days
              </option>
            ))}
          </select>
        </div>
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
          Update
        </Button>
        {business || days !== 7 ? (
          <Link
            href="/review"
            className="text-muted-foreground hover:text-foreground self-center text-sm hover:underline"
          >
            Reset
          </Link>
        ) : null}
      </form>

      {empty ? (
        <EmptyState
          title="Nothing happened in this period. Try a longer one, or log an activity on a company."
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
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Won"
              value={formatCents(wonTotal)}
              hint={`${review.won.length} ${review.won.length === 1 ? "deal" : "deals"}`}
            />
            <StatCard
              label="Lost"
              value={formatCents(lostTotal)}
              hint={`${review.lost.length} ${review.lost.length === 1 ? "deal" : "deals"}`}
            />
            <StatCard
              label="New companies"
              value={review.newCompanies.length}
              hint={`${review.newDeals} new ${review.newDeals === 1 ? "deal" : "deals"}`}
            />
            <StatCard
              label="Follow-ups done"
              value={review.followUpsDone.length}
              hint={`${review.followUpsAdded} added`}
            />
          </div>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">Logged</h2>
            <p className="text-muted-foreground text-sm">
              {logged} {logged === 1 ? "entry" : "entries"}:{" "}
              {ACTIVITY_TYPES.map(
                (type) =>
                  `${review.activityByType[type]} ${ACTIVITY_TYPE_LABEL[type].toLowerCase()}`,
              ).join(", ")}
              .{" "}
              <Link
                href={`/activity${business ? `?business=${business}` : ""}`}
                className="text-accent hover:underline"
              >
                See the activity log
              </Link>
            </p>
          </section>

          {review.won.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold">Won</h2>
              <DealTable deals={review.won} outcome="won" />
            </section>
          ) : null}

          {review.lost.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold">Lost</h2>
              <DealTable deals={review.lost} outcome="lost" />
            </section>
          ) : null}

          {review.newCompanies.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold">New companies</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {review.newCompanies.map((company) => (
                  <li key={company.id}>
                    <Link
                      href={`/companies/${company.id}`}
                      className="font-medium hover:underline"
                    >
                      {company.name}
                    </Link>{" "}
                    <span className="text-muted-foreground">
                      {BUSINESS_LABEL[company.business]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {review.followUpsDone.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold">Follow-ups done</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {review.followUpsDone.map((task) => (
                  <li key={task.id}>
                    {task.title}
                    {task.companyId ? (
                      <>
                        {" "}
                        <Link
                          href={`/companies/${task.companyId}`}
                          className="text-muted-foreground hover:underline"
                        >
                          {task.companyName}
                        </Link>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
