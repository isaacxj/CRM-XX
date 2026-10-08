import Link from "next/link";

import { Avatar } from "@/components/kit/avatar";
import { EmptyState } from "@/components/kit/data-table";
import { PageHeader } from "@/components/kit/page-header";
import {
  BusinessBadge,
  StageBadge,
  StatusBadge,
} from "@/components/kit/status-badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchAll } from "@/server/db/search";
import { BUSINESSES, type Business } from "@/server/db/schema";

const BUSINESS_LABEL: Record<Business, string> = {
  statixx: "Statixx",
  trazo: "Trazo",
};

const STAGE_LABEL: Record<string, string> = {
  qualified: "Qualified",
  discovery: "Discovery",
  proposal_sent: "Proposal sent",
  negotiation: "Negotiation",
  demo: "Demo",
  pilot: "Pilot",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
        {title}
        <span className="num text-xs">{count}</span>
      </h2>
      <Card className="divide-border divide-y p-0">{children}</Card>
    </section>
  );
}

function ResultRow({
  href,
  name,
  detail,
  badges,
}: {
  href: string;
  name: string;
  detail?: string;
  badges: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-surface-hover flex flex-wrap items-center gap-3 p-3 text-sm first:rounded-t-lg last:rounded-b-lg"
    >
      <Avatar name={name} />
      <span className="min-w-0 flex-1 basis-48">
        <span className="block truncate font-medium">{name}</span>
        {detail && (
          <span className="text-muted-foreground block truncate text-xs">
            {detail}
          </span>
        )}
      </span>
      <span className="flex items-center gap-2">{badges}</span>
    </Link>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const businessParam =
    typeof params.business === "string" ? params.business : "";
  const business = (BUSINESSES as readonly string[]).includes(businessParam)
    ? (businessParam as Business)
    : undefined;

  const results = await searchAll({ q, business });
  const total =
    results.companies.length + results.contacts.length + results.deals.length;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Search"
        description="Find companies, contacts, and deals in one place."
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-1 flex-col gap-1 sm:max-w-md">
          <label htmlFor="q" className="text-muted-foreground text-xs">
            Companies, contacts, and deals
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            autoFocus
            placeholder="Name, email, or deal title"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="business" className="text-muted-foreground text-xs">
            Business
          </label>
          <select
            id="business"
            name="business"
            defaultValue={business ?? ""}
            className="border-control bg-surface-raised h-9 rounded-md border px-3 text-sm"
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
          Search
        </Button>
      </form>

      {!q ? (
        <EmptyState title="Type part of a company name, a contact's name or email, or a deal title to find it." />
      ) : total === 0 ? (
        <EmptyState
          title={`Nothing matches "${q}". Try fewer letters, or switch the business filter to All.`}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <Section title="Companies" count={results.companies.length}>
            {results.companies.map((company) => (
              <ResultRow
                key={company.id}
                href={`/companies/${company.id}`}
                name={company.name}
                detail={company.website ?? undefined}
                badges={
                  <>
                    <BusinessBadge business={company.business} />
                    <StatusBadge status={company.status} />
                  </>
                }
              />
            ))}
          </Section>

          <Section title="Contacts" count={results.contacts.length}>
            {results.contacts.map((contact) => (
              <ResultRow
                key={contact.id}
                href={`/companies/${contact.companyId}`}
                name={contact.name}
                detail={[contact.title, contact.email, contact.companyName]
                  .filter(Boolean)
                  .join(" · ")}
                badges={<BusinessBadge business={contact.business} />}
              />
            ))}
          </Section>

          <Section title="Deals" count={results.deals.length}>
            {results.deals.map((deal) => (
              <ResultRow
                key={deal.id}
                href={`/companies/${deal.companyId}`}
                name={deal.title}
                detail={deal.companyName}
                badges={
                  <>
                    <span className="num text-sm">
                      {formatCents(deal.amountCents)}
                    </span>
                    <StageBadge stage={STAGE_LABEL[deal.stage] ?? deal.stage} />
                    <BusinessBadge business={deal.business} />
                  </>
                }
              />
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}
