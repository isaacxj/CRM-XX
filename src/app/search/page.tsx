import Link from "next/link";

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

const STATUS_LABEL: Record<string, string> = {
  prospect: "Prospect",
  client: "Client",
  past: "Past client",
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
      <h2 className="text-sm font-medium text-zinc-500">
        {title} ({count})
      </h2>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
        {children}
      </ul>
    </section>
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
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <h1 className="text-2xl font-semibold">Search</h1>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-1 flex-col gap-1 sm:max-w-md">
          <label htmlFor="q" className="text-xs text-zinc-500">
            Companies, contacts, and deals
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            autoFocus
            placeholder="Name, email, or deal title"
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="business" className="text-xs text-zinc-500">
            Business
          </label>
          <select
            id="business"
            name="business"
            defaultValue={business ?? ""}
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">All</option>
            {BUSINESSES.map((value) => (
              <option key={value} value={value}>
                {BUSINESS_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Search
        </button>
      </form>

      {!q ? (
        <p className="text-sm text-zinc-500">
          Type part of a company name, a contact&apos;s name or email, or a deal
          title to find it.
        </p>
      ) : total === 0 ? (
        <p className="text-sm text-zinc-500">
          Nothing matches &ldquo;{q}&rdquo;. Try fewer letters, or switch the
          business filter to All.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <Section title="Companies" count={results.companies.length}>
            {results.companies.map((company) => (
              <li key={company.id} className="py-2 text-sm">
                <Link
                  href={`/companies/${company.id}`}
                  className="font-medium hover:underline"
                >
                  {company.name}
                </Link>
                <span className="ml-2 text-zinc-500">
                  {BUSINESS_LABEL[company.business]} ·{" "}
                  {STATUS_LABEL[company.status] ?? company.status}
                  {company.website ? ` · ${company.website}` : ""}
                </span>
              </li>
            ))}
          </Section>

          <Section title="Contacts" count={results.contacts.length}>
            {results.contacts.map((contact) => (
              <li key={contact.id} className="py-2 text-sm">
                <Link
                  href={`/companies/${contact.companyId}`}
                  className="font-medium hover:underline"
                >
                  {contact.name}
                </Link>
                <span className="ml-2 text-zinc-500">
                  {[contact.title, contact.email].filter(Boolean).join(" · ")}
                  {contact.title || contact.email ? " · " : ""}
                  {contact.companyName} · {BUSINESS_LABEL[contact.business]}
                </span>
              </li>
            ))}
          </Section>

          <Section title="Deals" count={results.deals.length}>
            {results.deals.map((deal) => (
              <li key={deal.id} className="py-2 text-sm">
                <Link
                  href={`/companies/${deal.companyId}`}
                  className="font-medium hover:underline"
                >
                  {deal.title}
                </Link>
                <span className="ml-2 text-zinc-500">
                  {STAGE_LABEL[deal.stage] ?? deal.stage} ·{" "}
                  {formatCents(deal.amountCents)} · {deal.companyName} ·{" "}
                  {BUSINESS_LABEL[deal.business]}
                </span>
              </li>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}
