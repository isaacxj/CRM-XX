import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";

import { getDb } from "./index";
import {
  companies,
  deals,
  tasks,
  type Business,
  type CompanyStatus,
} from "./schema";

export type CompanySort = "name" | "last_activity";

export type CompanyFilters = {
  business?: Business;
  status?: CompanyStatus;
  q?: string;
  sort?: CompanySort;
  dir?: "asc" | "desc";
};

// Days without activity before a prospect or open deal counts as going cold.
export const COLD_AFTER_DAYS = 14;

// Latest of: a logged activity (not a future meeting), a task created or
// completed, a deal created, edited, or moved between stages. Falls back to
// when the company was added, so a brand-new company isn't cold.
// Drizzle drops the table prefix in single-table selects, which makes "id"
// ambiguous inside the subqueries, so spell these out.
const companyId = sql.raw('"companies"."id"');
const companyCreatedAt = sql.raw('"companies"."created_at"');

// D1 caps compound SELECT terms, so each source is its own scalar subquery.
const lastActivityAt = sql<string>`max(
  coalesce((select max(datetime(occurred_at)) from activities
    where company_id = ${companyId} and datetime(occurred_at) <= datetime('now')), ''),
  coalesce((select max(datetime(coalesce(done_at, created_at)))
    from tasks where company_id = ${companyId}), ''),
  coalesce((select max(datetime(updated_at)) from deals
    where company_id = ${companyId}), ''),
  coalesce((select max(datetime(e.created_at)) from deal_events e
    join deals d on d.id = e.deal_id where d.company_id = ${companyId}), ''),
  datetime(${companyCreatedAt})
)`;

export async function listCompanies(filters: CompanyFilters) {
  const db = getDb();

  const conditions = [isNull(companies.archivedAt)];
  if (filters.business)
    conditions.push(eq(companies.business, filters.business));
  if (filters.status) conditions.push(eq(companies.status, filters.status));
  if (filters.q) {
    conditions.push(
      sql`lower(${companies.name}) like ${`%${filters.q.toLowerCase()}%`}`,
    );
  }

  const order =
    filters.sort === "last_activity"
      ? [
          filters.dir === "desc" ? desc(lastActivityAt) : asc(lastActivityAt),
          asc(companies.name),
        ]
      : [asc(companies.name)];

  return db
    .select({ company: companies, lastActivityAt })
    .from(companies)
    .where(and(...conditions))
    .orderBy(...order)
    .then((rows) =>
      rows.map((r) => ({ ...r.company, lastActivityAt: r.lastActivityAt })),
    );
}

// Prospects and companies with an open deal that nobody has touched for
// COLD_AFTER_DAYS, stalest first.
export async function listGoingCold(business: Business) {
  const db = getDb();
  return db
    .select({
      id: companies.id,
      name: companies.name,
      status: companies.status,
      lastActivityAt,
      openDeals: sql<number>`(
        select count(*) from deals
        where company_id = ${companyId} and stage not in ('won', 'lost')
      )`,
    })
    .from(companies)
    .where(
      and(
        isNull(companies.archivedAt),
        eq(companies.business, business),
        sql`(${companies.status} = 'prospect' or exists (
          select 1 from deals
          where company_id = ${companyId} and stage not in ('won', 'lost')
        ))`,
        sql`${lastActivityAt} <= datetime('now', ${`-${COLD_AFTER_DAYS} days`})`,
      ),
    )
    .orderBy(asc(lastActivityAt), asc(companies.name));
}

export async function getCompany(id: number) {
  const db = getDb();
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, id));
  return company ?? null;
}

export type CompanyInput = {
  business: Business;
  name: string;
  website: string | null;
  status: CompanyStatus;
  source: string | null;
};

export async function createCompany(input: CompanyInput) {
  const db = getDb();
  const [company] = await db.insert(companies).values(input).returning();
  return company;
}

export async function updateCompany(id: number, input: CompanyInput) {
  const db = getDb();
  await db
    .update(companies)
    .set({ ...input, updatedAt: sql`(current_timestamp)` })
    .where(eq(companies.id, id));
}

export async function updateCompanyFields(
  id: number,
  patch: Partial<Pick<CompanyInput, "name" | "website" | "status" | "source">>,
) {
  const db = getDb();
  await db
    .update(companies)
    .set({ ...patch, updatedAt: sql`(current_timestamp)` })
    .where(eq(companies.id, id));
}

export async function getCompanyLastActivity(id: number) {
  const db = getDb();
  const [row] = await db
    .select({ lastActivityAt })
    .from(companies)
    .where(eq(companies.id, id));
  return row?.lastActivityAt ?? null;
}

export async function archiveCompany(id: number) {
  const db = getDb();
  await db
    .update(companies)
    .set({
      archivedAt: sql`(current_timestamp)`,
      updatedAt: sql`(current_timestamp)`,
    })
    .where(eq(companies.id, id));
}

export async function getHomeCounts(business: Business) {
  const db = getDb();

  const companyRows = await db
    .select()
    .from(companies)
    .where(and(eq(companies.business, business), isNull(companies.archivedAt)));

  const companyIds = companyRows.map((c) => c.id);

  if (companyIds.length === 0) {
    return {
      companyCount: 0,
      clientCount: 0,
      prospectCount: 0,
      openDealCount: 0,
      pipelineCents: 0,
      openTaskCount: 0,
    };
  }

  const [openDeals, openTasks] = await Promise.all([
    db
      .select()
      .from(deals)
      .where(
        and(
          inArray(deals.companyId, companyIds),
          ne(deals.stage, "won"),
          ne(deals.stage, "lost"),
        ),
      ),
    db
      .select()
      .from(tasks)
      .where(
        and(
          inArray(tasks.companyId, companyIds),
          eq(tasks.kind, "follow_up"),
          isNull(tasks.doneAt),
        ),
      ),
  ]);

  return {
    companyCount: companyRows.length,
    clientCount: companyRows.filter((c) => c.status === "client").length,
    prospectCount: companyRows.filter((c) => c.status === "prospect").length,
    openDealCount: openDeals.length,
    pipelineCents: openDeals.reduce((sum, d) => sum + d.amountCents, 0),
    openTaskCount: openTasks.length,
  };
}
