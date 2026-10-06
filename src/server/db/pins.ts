import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "./index";
import { companies, companyPins, companyViews } from "./schema";

export const RECENT_LIMIT = 5;

export async function listPinnedCompanies(ownerEmail: string) {
  const db = getDb();
  return db
    .select({
      id: companies.id,
      name: companies.name,
      business: companies.business,
    })
    .from(companyPins)
    .innerJoin(companies, eq(companies.id, companyPins.companyId))
    .where(
      and(eq(companyPins.ownerEmail, ownerEmail), isNull(companies.archivedAt)),
    )
    .orderBy(companies.name);
}

export async function isCompanyPinned(ownerEmail: string, companyId: number) {
  const db = getDb();
  const [row] = await db
    .select({ id: companyPins.id })
    .from(companyPins)
    .where(
      and(
        eq(companyPins.ownerEmail, ownerEmail),
        eq(companyPins.companyId, companyId),
      ),
    );
  return Boolean(row);
}

// Pins the company if it isn't pinned, unpins it if it is. Returns the new state.
export async function toggleCompanyPin(ownerEmail: string, companyId: number) {
  const db = getDb();
  if (await isCompanyPinned(ownerEmail, companyId)) {
    await db
      .delete(companyPins)
      .where(
        and(
          eq(companyPins.ownerEmail, ownerEmail),
          eq(companyPins.companyId, companyId),
        ),
      );
    return false;
  }
  await db
    .insert(companyPins)
    .values({ ownerEmail, companyId })
    .onConflictDoNothing();
  return true;
}

export async function recordCompanyView(ownerEmail: string, companyId: number) {
  const db = getDb();
  await db
    .insert(companyViews)
    .values({ ownerEmail, companyId })
    .onConflictDoUpdate({
      target: [companyViews.ownerEmail, companyViews.companyId],
      set: { viewedAt: sql`(current_timestamp)` },
    });
}

export async function listRecentCompanies(ownerEmail: string) {
  const db = getDb();
  return db
    .select({
      id: companies.id,
      name: companies.name,
      business: companies.business,
    })
    .from(companyViews)
    .innerJoin(companies, eq(companies.id, companyViews.companyId))
    .where(
      and(
        eq(companyViews.ownerEmail, ownerEmail),
        isNull(companies.archivedAt),
      ),
    )
    .orderBy(desc(companyViews.viewedAt), desc(companyViews.id))
    .limit(RECENT_LIMIT);
}
