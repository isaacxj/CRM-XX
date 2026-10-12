import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "./index";
import { companies, deals, type Business, type CompanyStatus } from "./schema";

export const NO_SOURCE = "No source";

export type SourceRow = {
  source: string;
  companies: number;
  clients: number;
  withWonDeal: number;
  openCount: number;
  openCents: number;
  wonOneTimeCents: number;
  wonMonthlyCents: number;
};

export type SourceCompany = {
  id: number;
  name: string;
  business: Business;
  status: CompanyStatus;
  openDeals: number;
  wonDeals: number;
};

// Sources are compared ignoring case and surrounding spaces, so "Referral" and
// " referral" count together. The first spelling seen is the one shown.
const sourceKey = sql<string>`lower(trim(coalesce(${companies.source}, '')))`;

// How each place a company came from performs: companies, how many became
// clients or won a deal, open pipeline and won revenue. Archived companies are
// left out. Most companies first.
export async function listSourcePerformance(
  business?: Business,
): Promise<SourceRow[]> {
  const db = getDb();
  const scoped = and(
    isNull(companies.archivedAt),
    business ? eq(companies.business, business) : undefined,
  );

  const base = await db
    .select({
      key: sourceKey,
      label: sql<string>`min(trim(${companies.source}))`,
      companies: sql<number>`count(*)`,
      clients: sql<number>`sum(case when ${companies.status} = 'client' then 1 else 0 end)`,
    })
    .from(companies)
    .where(scoped)
    .groupBy(sourceKey);

  const money = await db
    .select({
      key: sourceKey,
      withWonDeal: sql<number>`count(distinct case when ${deals.stage} = 'won' then ${companies.id} end)`,
      openCount: sql<number>`sum(case when ${deals.stage} not in ('won','lost') then 1 else 0 end)`,
      openCents: sql<number>`coalesce(sum(case when ${deals.stage} not in ('won','lost') then ${deals.amountCents} end), 0)`,
      wonOneTimeCents: sql<number>`coalesce(sum(case when ${deals.stage} = 'won' and ${deals.billing} = 'one_time' then ${deals.amountCents} end), 0)`,
      wonMonthlyCents: sql<number>`coalesce(sum(case when ${deals.stage} = 'won' and ${deals.billing} = 'monthly' then ${deals.amountCents} end), 0)`,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .where(scoped)
    .groupBy(sourceKey);
  const moneyByKey = new Map(money.map((row) => [row.key, row]));

  return base
    .map((row) => {
      const m = moneyByKey.get(row.key);
      return {
        source: row.key === "" ? NO_SOURCE : row.label,
        companies: Number(row.companies),
        clients: Number(row.clients),
        withWonDeal: Number(m?.withWonDeal ?? 0),
        openCount: Number(m?.openCount ?? 0),
        openCents: Number(m?.openCents ?? 0),
        wonOneTimeCents: Number(m?.wonOneTimeCents ?? 0),
        wonMonthlyCents: Number(m?.wonMonthlyCents ?? 0),
      };
    })
    .sort(
      (a, b) => b.companies - a.companies || a.source.localeCompare(b.source),
    );
}

// The companies behind one row of the table above. Pass NO_SOURCE for the
// companies with a blank source.
export async function listCompaniesForSource(
  source: string,
  business?: Business,
): Promise<SourceCompany[]> {
  const db = getDb();
  const key = source === NO_SOURCE ? "" : source.trim().toLowerCase();
  const rows = await db
    .select({
      id: companies.id,
      name: companies.name,
      business: companies.business,
      status: companies.status,
      openDeals: sql<number>`(select count(*) from deals d where d.company_id = companies.id and d.stage not in ('won','lost'))`,
      wonDeals: sql<number>`(select count(*) from deals d where d.company_id = companies.id and d.stage = 'won')`,
    })
    .from(companies)
    .where(
      and(
        isNull(companies.archivedAt),
        sql`${sourceKey} = ${key}`,
        business ? eq(companies.business, business) : undefined,
      ),
    )
    .orderBy(asc(companies.name))
    .limit(200);
  return rows.map((row) => ({
    ...row,
    openDeals: Number(row.openDeals),
    wonDeals: Number(row.wonDeals),
  }));
}
