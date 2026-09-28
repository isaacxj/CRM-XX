import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";

import { getDb } from "./index";
import {
  companies,
  deals,
  tasks,
  type Business,
  type CompanyStatus,
} from "./schema";

export type CompanyFilters = {
  business?: Business;
  status?: CompanyStatus;
  q?: string;
};

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

  return db
    .select()
    .from(companies)
    .where(and(...conditions))
    .orderBy(asc(companies.name));
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
      .where(and(inArray(tasks.companyId, companyIds), isNull(tasks.doneAt))),
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
