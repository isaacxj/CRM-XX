import { and, asc, eq, isNull, or, sql, type SQLWrapper } from "drizzle-orm";

import { getDb } from "./index";
import { companies, contacts, type Business } from "./schema";

// Max rows per tab on the Data gaps page.
export const DATA_GAPS_CAP = 200;

const blank = (column: SQLWrapper) =>
  or(isNull(column), sql`trim(${column}) = ''`);

const active = (business?: Business) =>
  and(
    isNull(companies.archivedAt),
    business ? eq(companies.business, business) : undefined,
  );

// Active companies missing a website, a source, or both.
export async function listCompaniesMissingDetails(business?: Business) {
  const db = getDb();
  return db
    .select({
      id: companies.id,
      name: companies.name,
      business: companies.business,
      status: companies.status,
      website: companies.website,
      source: companies.source,
    })
    .from(companies)
    .where(
      and(
        active(business),
        or(blank(companies.website), blank(companies.source)),
      ),
    )
    .orderBy(asc(companies.name))
    .limit(DATA_GAPS_CAP);
}

// Active prospects and clients that have no contact person yet.
export async function listCompaniesWithoutContacts(business?: Business) {
  const db = getDb();
  return db
    .select({
      id: companies.id,
      name: companies.name,
      business: companies.business,
      status: companies.status,
    })
    .from(companies)
    .where(
      and(
        active(business),
        sql`${companies.status} in ('prospect', 'client')`,
        sql`not exists (
          select 1 from contacts where contacts.company_id = ${companies.id}
        )`,
      ),
    )
    .orderBy(asc(companies.name))
    .limit(DATA_GAPS_CAP);
}

// Contacts at active companies with no email address.
export async function listContactsMissingEmail(business?: Business) {
  const db = getDb();
  return db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      phone: contacts.phone,
      companyId: companies.id,
      companyName: companies.name,
      business: companies.business,
    })
    .from(contacts)
    .innerJoin(companies, eq(companies.id, contacts.companyId))
    .where(and(active(business), blank(contacts.email)))
    .orderBy(asc(contacts.name))
    .limit(DATA_GAPS_CAP);
}

export async function getDataGapCounts(business?: Business) {
  const db = getDb();
  const [details] = await db
    .select({ n: sql<number>`count(*)` })
    .from(companies)
    .where(
      and(
        active(business),
        or(blank(companies.website), blank(companies.source)),
      ),
    );
  const [none] = await db
    .select({ n: sql<number>`count(*)` })
    .from(companies)
    .where(
      and(
        active(business),
        sql`${companies.status} in ('prospect', 'client')`,
        sql`not exists (
          select 1 from contacts where contacts.company_id = ${companies.id}
        )`,
      ),
    );
  const [email] = await db
    .select({ n: sql<number>`count(*)` })
    .from(contacts)
    .innerJoin(companies, eq(companies.id, contacts.companyId))
    .where(and(active(business), blank(contacts.email)));
  return {
    details: details?.n ?? 0,
    contacts: none?.n ?? 0,
    email: email?.n ?? 0,
  };
}

// Fills in blank company fields only; a value someone typed in the meantime
// is never overwritten.
export async function fillCompanyDetails(
  id: number,
  patch: { website?: string | null; source?: string | null },
) {
  const db = getDb();
  if (patch.website) {
    await db
      .update(companies)
      .set({ website: patch.website, updatedAt: sql`(current_timestamp)` })
      .where(and(eq(companies.id, id), blank(companies.website)));
  }
  if (patch.source) {
    await db
      .update(companies)
      .set({ source: patch.source, updatedAt: sql`(current_timestamp)` })
      .where(and(eq(companies.id, id), blank(companies.source)));
  }
}

export async function fillContactEmail(id: number, email: string) {
  const db = getDb();
  await db
    .update(contacts)
    .set({ email, updatedAt: sql`(current_timestamp)` })
    .where(and(eq(contacts.id, id), blank(contacts.email)));
}
