import { and, asc, eq, isNull, sql, type SQL } from "drizzle-orm";

import { getDb } from "./index";
import { companies, contacts, deals, type Business } from "./schema";

const RESULT_LIMIT = 25;

export type SearchScope = { q: string; business?: Business };

export function likePattern(q: string) {
  const escaped = q.toLowerCase().replace(/[\\%_]/g, (char) => `\\${char}`);
  return `%${escaped}%`;
}

export function matches(column: unknown, pattern: string): SQL {
  return sql`lower(coalesce(${column}, '')) like ${pattern} escape '\\'`;
}

export async function searchAll({ q, business }: SearchScope) {
  const term = q.trim();
  if (!term) return { companies: [], contacts: [], deals: [] };

  const db = getDb();
  const pattern = likePattern(term);
  const inBusiness = business ? eq(companies.business, business) : undefined;
  const notArchived = isNull(companies.archivedAt);

  const [companyRows, contactRows, dealRows] = await Promise.all([
    db
      .select({
        id: companies.id,
        name: companies.name,
        business: companies.business,
        status: companies.status,
        website: companies.website,
      })
      .from(companies)
      .where(
        and(
          notArchived,
          inBusiness,
          sql`(${matches(companies.name, pattern)} or ${matches(companies.website, pattern)})`,
        ),
      )
      .orderBy(asc(companies.name))
      .limit(RESULT_LIMIT),
    db
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        title: contacts.title,
        companyId: contacts.companyId,
        companyName: companies.name,
        business: companies.business,
      })
      .from(contacts)
      .innerJoin(companies, eq(contacts.companyId, companies.id))
      .where(
        and(
          notArchived,
          inBusiness,
          sql`(${matches(contacts.name, pattern)} or ${matches(contacts.email, pattern)} or ${matches(contacts.title, pattern)})`,
        ),
      )
      .orderBy(asc(contacts.name))
      .limit(RESULT_LIMIT),
    db
      .select({
        id: deals.id,
        title: deals.title,
        stage: deals.stage,
        amountCents: deals.amountCents,
        companyId: deals.companyId,
        companyName: companies.name,
        business: companies.business,
      })
      .from(deals)
      .innerJoin(companies, eq(deals.companyId, companies.id))
      .where(and(notArchived, inBusiness, matches(deals.title, pattern)))
      .orderBy(asc(deals.title))
      .limit(RESULT_LIMIT),
  ]);

  return { companies: companyRows, contacts: contactRows, deals: dealRows };
}
