import { and, asc, eq, isNull, notInArray, sql } from "drizzle-orm";

import { getDb } from "./index";
import {
  companies,
  dealEvents,
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
      // When the deal entered its current stage: last stage change, else created.
      stageSince: sql<string>`coalesce((select max(${dealEvents.createdAt}) from ${dealEvents} where ${dealEvents.dealId} = ${deals.id}), ${deals.createdAt})`,
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
  const [current] = await db
    .select({ stage: deals.stage })
    .from(deals)
    .where(eq(deals.id, id));
  if (!current) {
    throw new Error("Deal not found.");
  }

  const update = db
    .update(deals)
    .set({
      stage,
      lostReason: stage === "lost" ? trimmedReason : null,
      updatedAt: sql`(current_timestamp)`,
    })
    .where(eq(deals.id, id));

  if (current.stage === stage) {
    await update;
    return;
  }

  // D1 has no interactive transactions; a batch is atomic.
  await db.batch([
    update,
    db
      .insert(dealEvents)
      .values({ dealId: id, fromStage: current.stage, toStage: stage }),
  ]);
}

export async function deleteDeal(id: number) {
  const db = getDb();
  await db.delete(deals).where(eq(deals.id, id));
}

export type PipelineSnapshotRow = {
  business: Business;
  stage: string;
  count: number;
  cents: number;
};

// Open deals (not won or lost) grouped by business and stage, for the Today
// page's pipeline bars. Archived companies are left out.
export async function getPipelineSnapshot(
  business?: Business,
): Promise<PipelineSnapshotRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      business: companies.business,
      stage: deals.stage,
      count: sql<number>`count(*)`,
      cents: sql<number>`coalesce(sum(${deals.amountCents}), 0)`,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .where(
      and(
        isNull(companies.archivedAt),
        notInArray(deals.stage, ["won", "lost"]),
        business ? eq(companies.business, business) : undefined,
      ),
    )
    .groupBy(companies.business, deals.stage);
  return rows.map((r) => ({
    ...r,
    count: Number(r.count),
    cents: Number(r.cents),
  }));
}
