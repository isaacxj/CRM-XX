import Link from "next/link";

import { DataTable, EmptyState, Td, Th, Tr } from "@/components/kit/data-table";
import { PageHeader } from "@/components/kit/page-header";
import { Pagination } from "@/components/kit/pagination";
import { BusinessBadge } from "@/components/kit/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WhoFilter, parseWho, type Who } from "@/components/who-filter";
import { formatMeetingTime, ownerLabel } from "@/lib/activity";
import { pageWindow, parsePage } from "@/lib/pagination";
import { countMeetings, listMeetings } from "@/server/db/activities";
import { BUSINESSES } from "@/server/db/schema";
import { getCurrentUserEmail } from "@/server/user";

const BUSINESS_LABEL = { statixx: "Statixx", trazo: "Trazo" } as const;
const WHEN = ["upcoming", "past"] as const;

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const when = WHEN.find((value) => value === params.when) ?? "upcoming";
  const business = BUSINESSES.find((value) => value === params.business);
  const me = await getCurrentUserEmail();
  const who: Who = me ? parseWho(params.who) : "everyone";
  const owner = who === "mine" ? me : null;

  const base = { business, owner, q: q || undefined };
  const [upcomingCount, pastCount] = await Promise.all([
    countMeetings({ ...base, when: "upcoming" }),
    countMeetings({ ...base, when: "past" }),
  ]);
  const total = when === "upcoming" ? upcomingCount : pastCount;
  const window = pageWindow(parsePage(params.page), total);
  const meetings = await listMeetings({
    ...base,
    when,
    limit: window.limit,
    offset: window.offset,
  });

  const hrefWith = (next: { when?: string; who?: Who }, page = 1) => {
    const sp = new URLSearchParams();
    const w = next.when ?? when;
    const o = next.who ?? who;
    if (w !== "upcoming") sp.set("when", w);
    if (business) sp.set("business", business);
    if (o === "mine") sp.set("who", "mine");
    if (q) sp.set("q", q);
    if (page > 1) sp.set("page", String(page));
    return sp.size ? `/meetings?${sp}` : "/meetings";
  };
  const hasFilters = Boolean(q || business || who === "mine");

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Meetings"
        description="Every meeting logged on a company. Open a row to go to its company."
      />

      <div className="flex flex-wrap gap-1" role="group" aria-label="When">
        {WHEN.map((value) => {
          const active = value === when;
          return (
            <Link
              key={value}
              href={hrefWith({ when: value })}
              aria-current={active ? "true" : undefined}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-sm max-md:min-h-(--tap-target) ${
                active
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              {value === "upcoming" ? "Upcoming" : "Past"}
              <span className="num text-xs">
                {value === "upcoming" ? upcomingCount : pastCount}
              </span>
            </Link>
          );
        })}
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        {when !== "upcoming" ? (
          <input type="hidden" name="when" value={when} />
        ) : null}
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
            Search meetings
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
            href={when === "past" ? "/meetings?when=past" : "/meetings"}
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
              ? "No meetings match these filters. Try fewer words or clear the filters."
              : when === "upcoming"
                ? "No upcoming meetings. Open a company and log a meeting with a future date."
                : "No past meetings yet."
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
              <Th>Meeting</Th>
              <Th>Company</Th>
              <Th>Business</Th>
              <Th>Owner</Th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((meeting) => (
              <Tr key={meeting.id} href={`/companies/${meeting.companyId}`}>
                <Td className="whitespace-nowrap">
                  <span className="num">
                    {formatMeetingTime(meeting.occurredAt, meeting.endsAt)}
                  </span>
                </Td>
                <Td>
                  <span className="font-medium">
                    {meeting.subject || "Meeting"}
                  </span>
                  {meeting.contactName ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · {meeting.contactName}
                    </span>
                  ) : null}
                </Td>
                <Td>{meeting.companyName}</Td>
                <Td>
                  <BusinessBadge business={meeting.business} />
                </Td>
                <Td className="text-muted-foreground">
                  {ownerLabel(meeting.ownerEmail) ?? "—"}
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}
      <Pagination
        page={window.page}
        total={total}
        noun="meetings"
        hrefFor={(page) => hrefWith({}, page)}
      />
    </div>
  );
}
