import { and, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "./index";
import { activities, companies, type Business } from "./schema";

export type StartProgress = {
  business: Business;
  companies: number;
  activities: number;
};

// How far a business is from having real data in it, for the Today checklist.
export async function getStartProgress(
  business: Business,
): Promise<StartProgress> {
  const db = getDb();
  const [c] = await db
    .select({ n: sql<number>`count(*)` })
    .from(companies)
    .where(and(eq(companies.business, business), isNull(companies.archivedAt)));
  const [a] = await db
    .select({ n: sql<number>`count(*)` })
    .from(activities)
    .innerJoin(companies, eq(activities.companyId, companies.id))
    .where(eq(companies.business, business));
  return { business, companies: c?.n ?? 0, activities: a?.n ?? 0 };
}
