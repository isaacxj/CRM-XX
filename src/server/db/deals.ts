import { asc, eq, sql } from "drizzle-orm";

import { getDb } from "./index";
import {
  companies,
  deals,
  type Business,
  type DealBilling,
  type DealStage,
} from "./schema";

export async function listDealsForCompany(companyId: number) {
  const db = getDb();
  return db
    .select()
    .from(deals)
    .where(eq(deals.companyId, companyId))
    .orderBy(asc(deals.createdAt));
}

export async function listDealsForBoard(business: Business) {
  const db = getDb();
  return db
    .select({
      id: deals.id,
      title: deals.title,
      stage: deals.stage,
      amountCents: deals.amountCents,
      billing: deals.billing,
      closeDate: deals.closeDate,
      lostReason: deals.lostReason,
      companyId: deals.companyId,
      companyName: companies.name,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .where(eq(companies.business, business))
    .orderBy(asc(deals.createdAt));
}

export type DealInput = {
  title: string;
  amountCents: number;
  billing: DealBilling;
  closeDate: string | null;
};

export async function createDeal(companyId: number, input: DealInput) {
  const db = getDb();
  const [deal] = await db
    .insert(deals)
    .values({ companyId, ...input })
    .returning();
  return deal;
}

export async function moveDealStage(
  id: number,
  stage: DealStage,
  lostReason: string | null,
) {
  const trimmedReason = lostReason?.trim() || null;
  if (stage === "lost" && !trimmedReason) {
    throw new Error("Moving a deal to Lost needs a reason.");
  }

  const db = getDb();
  await db
    .update(deals)
    .set({
      stage,
      lostReason: stage === "lost" ? trimmedReason : null,
      updatedAt: sql`(current_timestamp)`,
    })
    .where(eq(deals.id, id));
}

export async function deleteDeal(id: number) {
  const db = getDb();
  await db.delete(deals).where(eq(deals.id, id));
}
