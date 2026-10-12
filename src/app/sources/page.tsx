import Link from "next/link";

import { formatCents } from "@/components/deal-shared";
import { DataTable, EmptyState, Td, Th, Tr } from "@/components/kit/data-table";
import { PageHeader } from "@/components/kit/page-header";
import { StatCard } from "@/components/kit/stat-card";
import { BusinessBadge, StatusBadge } from "@/components/kit/status-badges";
import { Button } from "@/components/ui/button";
import {
  listCompaniesForSource,
  listSourcePerformance,
  NO_SOURCE,
} from "@/server/db/sources";
import { BUSINESSES } from "@/server/db/schema";

const BUSINESS_LABEL = { statixx: "Statixx", trazo: "Trazo" } as const;

function percent(part: number, whole: number) {
  return whole === 0 ? "–" : `${Math.round((part / whole) * 100)}%`;
}

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const business = BUSINESSES.find((value) => value === params.business);
  const picked = typeof params.source === "string" ? params.source : "";

  const rows = await listSourcePerformance(business);
  const selected = picked ? await listCompaniesForSource(picked, business) : [];

  const totalCompanies = rows.reduce((sum, row) => sum + row.companies, 0);
  const totalClients = rows.reduce((sum, row) => sum + row.clients, 0);
  const named = rows.filter((row) => row.source !== NO_SOURCE);
  const best = [...named]
    .filter((row) => row.companies >= 2)
    .sort(
      (a, b) =>
        b.clients / b.companies - a.clients / a.companies ||
        b.companies - a.companies,
    )[0];

  const businessQuery = business ? `&business=${business}` : "";

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Sources"
        description="Where your companies come from, and which places turn into clients and won deals."
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
          Update
        </Button>
        {business || picked ? (
          <Link
            href="/sources"
            className="text-muted-foreground hover:text-foreground self-center text-sm hover:underline"
          >
            Reset
          </Link>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="No companies yet. Add a company and fill in where it came from, or import a CSV with a source column."
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
            <StatCard label="Companies" value={totalCompanies} />
            <StatCard
              label="Clients"
              value={totalClients}
              hint={`${percent(totalClients, totalCompanies)} of companies`}
            />
            <StatCard label="Sources" value={named.length} />
            <StatCard
              label="Best converting"
              value={best ? best.source : "–"}
              hint={
                best
                  ? `${percent(best.clients, best.companies)} became clients`
                  : "Needs a source with 2+ companies"
              }
            />
          </div>

          <DataTable>
            <thead>
              <tr>
                <Th>Source</Th>
                <Th className="text-right">Companies</Th>
                <Th className="text-right">Clients</Th>
                <Th className="text-right">Won a deal</Th>
                <Th className="text-right">Open pipeline</Th>
                <Th className="text-right">Won</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Tr key={row.source}>
                  <Td className="font-medium">
                    <Link
                      href={`/sources?source=${encodeURIComponent(row.source)}${businessQuery}`}
                      className="hover:underline"
                    >
                      {row.source}
                    </Link>
                  </Td>
                  <Td className="num text-right">{row.companies}</Td>
                  <Td className="num text-right">
                    {row.clients}{" "}
                    <span className="text-muted-foreground">
                      {percent(row.clients, row.companies)}
                    </span>
                  </Td>
                  <Td className="num text-right">{row.withWonDeal}</Td>
                  <Td className="num text-right">
                    {row.openCount > 0 ? formatCents(row.openCents) : "–"}
                  </Td>
                  <Td className="num text-right">
                    {row.wonOneTimeCents > 0 ? (
                      <div>{formatCents(row.wonOneTimeCents)}</div>
                    ) : null}
                    {row.wonMonthlyCents > 0 ? (
                      <div>{formatCents(row.wonMonthlyCents)}/mo</div>
                    ) : null}
                    {row.wonOneTimeCents + row.wonMonthlyCents === 0
                      ? "–"
                      : null}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>

          {picked ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-base font-semibold">
                {picked}{" "}
                <span className="text-muted-foreground text-sm font-normal">
                  {selected.length}{" "}
                  {selected.length === 1 ? "company" : "companies"}
                </span>
              </h2>
              {selected.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No companies have this source for the chosen business.
                </p>
              ) : (
                <DataTable>
                  <thead>
                    <tr>
                      <Th>Company</Th>
                      <Th>Business</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Open deals</Th>
                      <Th className="text-right">Won deals</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.map((company) => (
                      <Tr key={company.id}>
                        <Td className="font-medium">
                          <Link
                            href={`/companies/${company.id}`}
                            className="hover:underline"
                          >
                            {company.name}
                          </Link>
                        </Td>
                        <Td>
                          <BusinessBadge business={company.business} />
                        </Td>
                        <Td>
                          <StatusBadge status={company.status} />
                        </Td>
                        <Td className="num text-right">{company.openDeals}</Td>
                        <Td className="num text-right">{company.wonDeals}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
