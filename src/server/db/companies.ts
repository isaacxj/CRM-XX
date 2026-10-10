import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  sql,
} from "drizzle-orm";

import { likePattern, matches } from "./search";
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
  limit?: number;
  offset?: number;
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

function companyConditions(filters: CompanyFilters) {
  const conditions = [isNull(companies.archivedAt)];
  if (filters.business)
    conditions.push(eq(companies.business, filters.business));
  if (filters.status) conditions.push(eq(companies.status, filters.status));
  if (filters.q) {
    conditions.push(matches(companies.name, likePattern(filters.q)));
  }
  return and(...conditions);
}

export async function countCompanies(filters: CompanyFilters) {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(companies)
    .where(companyConditions(filters));
  return Number(row?.count ?? 0);
}

// Just enough to fill a picker or a select: no activity lookups, no paging.
export async function listCompanyOptions() {
  const db = getDb();
  return db
    .select({
      id: companies.id,
      name: companies.name,
      business: companies.business,
    })
    .from(companies)
    .where(isNull(companies.archivedAt))
    .orderBy(asc(companies.name));
}

export async function listCompanies(filters: CompanyFilters) {
  const db = getDb();

  const order =
    filters.sort === "last_activity"
      ? [
          filters.dir === "desc" ? desc(lastActivityAt) : asc(lastActivityAt),
          asc(companies.name),
        ]
      : [asc(companies.name)];

  const query = db
    .select({ company: companies, lastActivityAt })
    .from(companies)
    .where(companyConditions(filters))
    .orderBy(...order);

  return (
    filters.limit !== undefined
      ? query.limit(filters.limit).offset(filters.offset ?? 0)
      : query
  ).then((rows) =>
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

// Max rows on the No next step page.
export const NO_NEXT_STEP_CAP = 300;

// Active (prospect or client) companies with nothing planned: no open task of
// any kind and no meeting still to come. Stalest first.
export async function listWithoutNextStep(
  filters: { business?: Business; q?: string } = {},
) {
  const db = getDb();
  return db
    .select({
      id: companies.id,
      name: companies.name,
      business: companies.business,
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
        inArray(companies.status, ["prospect", "client"]),
        filters.business ? eq(companies.business, filters.business) : undefined,
        filters.q ? matches(companies.name, likePattern(filters.q)) : undefined,
        sql`not exists (
          select 1 from tasks
          where company_id = ${companyId} and done_at is null
        )`,
        sql`not exists (
          select 1 from activities
          where company_id = ${companyId} and type = 'meeting'
            and datetime(occurred_at) > datetime('now')
        )`,
      ),
    )
    .orderBy(asc(lastActivityAt), asc(companies.name))
    .limit(NO_NEXT_STEP_CAP);
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

export async function restoreCompany(id: number) {
  const db = getDb();
  await db
    .update(companies)
    .set({ archivedAt: null, updatedAt: sql`(current_timestamp)` })
    .where(eq(companies.id, id));
}

export async function getHomeCounts(business: Business) {
  const db = getDb();
  const live = and(
    eq(companies.business, business),
    isNull(companies.archivedAt),
  );

  const [[counts], [openDeals], [openTasks]] = await Promise.all([
    db
      .select({
        companyCount: sql<number>`count(*)`,
        clientCount: sql<number>`coalesce(sum(${companies.status} = 'client'), 0)`,
        prospectCount: sql<number>`coalesce(sum(${companies.status} = 'prospect'), 0)`,
      })
      .from(companies)
      .where(live),
    db
      .select({
        count: sql<number>`count(*)`,
        cents: sql<number>`coalesce(sum(${deals.amountCents}), 0)`,
      })
      .from(deals)
      .innerJoin(companies, eq(deals.companyId, companies.id))
      .where(and(live, ne(deals.stage, "won"), ne(deals.stage, "lost"))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .innerJoin(companies, eq(tasks.companyId, companies.id))
      .where(and(live, eq(tasks.kind, "follow_up"), isNull(tasks.doneAt))),
  ]);

  return {
    companyCount: Number(counts?.companyCount ?? 0),
    clientCount: Number(counts?.clientCount ?? 0),
    prospectCount: Number(counts?.prospectCount ?? 0),
    openDealCount: Number(openDeals?.count ?? 0),
    pipelineCents: Number(openDeals?.cents ?? 0),
    openTaskCount: Number(openTasks?.count ?? 0),
  };
}

// D1 allows 100 bound parameters per statement; a list page shows 50 rows.
export const BULK_MAX = 50;

export async function bulkArchiveCompanies(ids: number[]) {
  const db = getDb();
  const rows = await db
    .update(companies)
    .set({
      archivedAt: sql`(current_timestamp)`,
      updatedAt: sql`(current_timestamp)`,
    })
    .where(and(inArray(companies.id, ids), isNull(companies.archivedAt)))
    .returning({ id: companies.id });
  return rows.map((r) => r.id);
}

export async function bulkRestoreCompanies(ids: number[]) {
  const db = getDb();
  await db
    .update(companies)
    .set({ archivedAt: null, updatedAt: sql`(current_timestamp)` })
    .where(and(inArray(companies.id, ids), isNotNull(companies.archivedAt)));
}

export async function bulkSetCompanyStatus(
  ids: number[],
  status: CompanyStatus,
) {
  const db = getDb();
  const rows = await db
    .update(companies)
    .set({ status, updatedAt: sql`(current_timestamp)` })
    .where(and(inArray(companies.id, ids), isNull(companies.archivedAt)))
    .returning({ id: companies.id });
  return rows.length;
}

// Deal stages differ per business, so a company that has deals stays where
// it is. Returns how many moved; the rest were skipped.
export async function bulkSetCompanyBusiness(
  ids: number[],
  business: Business,
) {
  const db = getDb();
  const rows = await db
    .update(companies)
    .set({ business, updatedAt: sql`(current_timestamp)` })
    .where(
      and(
        inArray(companies.id, ids),
        isNull(companies.archivedAt),
        sql`not exists (select 1 from deals where company_id = ${companyId})`,
      ),
    )
    .returning({ id: companies.id });
  return rows.length;
}
