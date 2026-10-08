import Link from "next/link";

import { DataTable, EmptyState, Td, Th, Tr } from "@/components/kit/data-table";
import { PageHeader } from "@/components/kit/page-header";
import { Pagination } from "@/components/kit/pagination";
import { BusinessBadge } from "@/components/kit/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WhoFilter, parseWho, type Who } from "@/components/who-filter";
import {
  ACTIVITY_TYPE_ICON,
  ACTIVITY_TYPE_LABEL,
  formatDaysAgo,
  ownerLabel,
} from "@/lib/activity";
import { pageWindow, parsePage } from "@/lib/pagination";
import {
  countActivityLog,
  countActivityLogByType,
  listActivityLog,
} from "@/server/db/activities";
import { ACTIVITY_TYPES, BUSINESSES } from "@/server/db/schema";
import { getCurrentUserEmail } from "@/server/user";

const BUSINESS_LABEL = { statixx: "Statixx", trazo: "Trazo" } as const;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const type = ACTIVITY_TYPES.find((value) => value === params.type);
  const business = BUSINESSES.find((value) => value === params.business);
  const me = await getCurrentUserEmail();
  const who: Who = me ? parseWho(params.who) : "everyone";
  const owner = who === "mine" ? me : null;

  const base = { business, owner, q: q || undefined };
  const [total, byType] = await Promise.all([
    countActivityLog({ ...base, type }),
    countActivityLogByType(base),
  ]);
  const window = pageWindow(parsePage(params.page), total);
  const entries = await listActivityLog({
    ...base,
    type,
    limit: window.limit,
    offset: window.offset,
  });
  const allCount = Object.values(byType).reduce((sum, n) => sum + (n ?? 0), 0);

  const hrefWith = (next: { type?: string; who?: Who }, page = 1) => {
    const sp = new URLSearchParams();
    const t = "type" in next ? next.type : type;
    const w = next.who ?? who;
    if (t) sp.set("type", t);
    if (business) sp.set("business", business);
    if (w === "mine") sp.set("who", "mine");
    if (q) sp.set("q", q);
    if (page > 1) sp.set("page", String(page));
    return sp.size ? `/activity?${sp}` : "/activity";
  };
  const hasFilters = Boolean(q || business || type || who === "mine");

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Activity"
        description="Every note, email, call, and meeting across your companies, newest first. Open a row to go to its company."
      />

      <div className="flex flex-wrap gap-1" role="group" aria-label="Type">
        {[undefined, ...ACTIVITY_TYPES].map((t) => {
          const count = t ? (byType[t] ?? 0) : allCount;
          const active = t === type;
          return (
            <Link
              key={t ?? "all"}
              href={hrefWith({ type: t })}
              aria-current={active ? "true" : undefined}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-sm max-md:min-h-(--tap-target) ${
                active
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              {t ? <span aria-hidden>{ACTIVITY_TYPE_ICON[t]}</span> : null}
              {t ? ACTIVITY_TYPE_LABEL[t] : "All"}
              <span className="num text-xs">{count}</span>
            </Link>
          );
        })}
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        {type ? <input type="hidden" name="type" value={type} /> : null}
        {who === "mine" ? (
          <input type="hidden" name="who" value="mine" />
        ) : null}
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
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-muted-foreground text-xs">
            Search activity
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Subject, details, company or contact"
            className="w-72"
          />
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {me ? (
          <WhoFilter who={who} hrefFor={(w) => hrefWith({ who: w })} />
        ) : null}
        {hasFilters ? (
          <Link
            href="/activity"
            className="text-muted-foreground hover:text-foreground self-center text-sm hover:underline"
          >
            Clear filters
          </Link>
        ) : null}
      </form>

      {total === 0 ? (
        <EmptyState
          title={
            hasFilters
              ? "No activity matches these filters. Try fewer words, another type, or clear the filters."
              : "Nothing logged yet. Open a company and log a note, email, call, or meeting."
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
              <Th>When</Th>
              <Th>Type</Th>
              <Th>What</Th>
              <Th>Company</Th>
              <Th>Business</Th>
              <Th>Owner</Th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const what =
                entry.subject || entry.body.split("\n")[0].slice(0, 120) || "—";
              return (
                <Tr key={entry.id} href={`/companies/${entry.companyId}`}>
                  <Td className="text-muted-foreground whitespace-nowrap">
                    {formatDaysAgo(entry.occurredAt)}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <span aria-hidden>{ACTIVITY_TYPE_ICON[entry.type]}</span>{" "}
                    {ACTIVITY_TYPE_LABEL[entry.type]}
                  </Td>
                  <Td>
                    <span className="font-medium">{what}</span>
                    {entry.contactName ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {entry.contactName}
                      </span>
                    ) : null}
                  </Td>
                  <Td>{entry.companyName}</Td>
                  <Td>
                    <BusinessBadge business={entry.business} />
                  </Td>
                  <Td className="text-muted-foreground">
                    {ownerLabel(entry.ownerEmail) ?? "—"}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </DataTable>
      )}
      <Pagination
        page={window.page}
        total={total}
        noun="activities"
        hrefFor={(page) => hrefWith({}, page)}
      />
    </div>
  );
}
