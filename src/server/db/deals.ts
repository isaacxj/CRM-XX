import { and, asc, desc, eq, isNull, notInArray, sql } from "drizzle-orm";

import { getDb } from "./index";
import { likePattern, matches } from "./search";
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

// Cards shown per column on the board; headers still count every deal.
export const BOARD_STAGE_CAP = 40;

export type StageTotal = { count: number; cents: number };

export const DEAL_STATUSES = ["open", "won", "lost"] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

// Filters on the deals page; every one is optional.
export type DealFilters = {
  q?: string;
  billing?: DealBilling;
  status?: DealStatus;
};

function filterConditions(filters: DealFilters) {
  const conditions = [];
  if (filters.q)
    conditions.push(
      sql`(${matches(deals.title, likePattern(filters.q))} or ${matches(companies.name, likePattern(filters.q))})`,
    );
  if (filters.billing) conditions.push(eq(deals.billing, filters.billing));
  if (filters.status === "open")
    conditions.push(notInArray(deals.stage, ["won", "lost"]));
  if (filters.status === "won" || filters.status === "lost")
    conditions.push(eq(deals.stage, filters.status));
  return conditions;
}

// The same filters written against the aliases used inside the board's
// per-stage ranking subquery.
function rankFilter(filters: DealFilters) {
  const parts = [sql`true`];
  if (filters.q) {
    const pattern = likePattern(filters.q);
    parts.push(
      sql`(${matches(sql.raw("d.title"), pattern)} or ${matches(sql.raw("c.name"), pattern)})`,
    );
  }
  if (filters.billing) parts.push(sql`d.billing = ${filters.billing}`);
  if (filters.status === "open")
    parts.push(sql`d.stage not in ('won', 'lost')`);
  if (filters.status === "won" || filters.status === "lost")
    parts.push(sql`d.stage = ${filters.status}`);
  return sql.join(parts, sql` and `);
}

export async function getStageTotals(
  business: Business,
  filters: DealFilters = {},
): Promise<Record<string, StageTotal>> {
  const db = getDb();
  const rows = await db
    .select({
      stage: deals.stage,
      count: sql<number>`count(*)`,
      cents: sql<number>`coalesce(sum(${deals.amountCents}), 0)`,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .where(and(eq(companies.business, business), ...filterConditions(filters)))
    .groupBy(deals.stage);
  return Object.fromEntries(
    rows.map((r) => [
      r.stage,
      { count: Number(r.count), cents: Number(r.cents) },
    ]),
  );
}

// `perStage` keeps only the newest N deals in each stage (the board);
// `limit` and `offset` page through everything (the list).
export async function listDealsForBoard(
  business: Business,
  opts: {
    perStage?: number;
    limit?: number;
    offset?: number;
    filters?: DealFilters;
  } = {},
) {
  const filters = opts.filters ?? {};
  const db = getDb();
  const query = db
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
    .where(
      and(
        eq(companies.business, business),
        ...filterConditions(filters),
        opts.perStage !== undefined
          ? sql`${deals.id} in (
              select id from (
                select d.id, row_number() over (
                  partition by d.stage order by d.created_at desc, d.id desc
                ) as rn
                from deals d join companies c on c.id = d.company_id
                where c.business = ${business} and ${rankFilter(filters)}
              ) where rn <= ${opts.perStage}
            )`
          : undefined,
      ),
    )
    .orderBy(asc(deals.createdAt), asc(deals.id));

  return opts.limit !== undefined
    ? query.limit(opts.limit).offset(opts.offset ?? 0)
    : query;
}

export type DealStageChange = {
  id: number;
  at: string;
  fromStage: DealStage | null;
  toStage: DealStage;
};

// One deal with its company and stage history (newest change first), for the
// deal panel on the board.
export async function getDealDetail(id: number) {
  const db = getDb();
  const [deal] = await db
    .select({
      id: deals.id,
      title: deals.title,
      stage: deals.stage,
      amountCents: deals.amountCents,
      billing: deals.billing,
      closeDate: deals.closeDate,
      lostReason: deals.lostReason,
      createdAt: deals.createdAt,
      companyId: deals.companyId,
      companyName: companies.name,
      business: companies.business,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .where(eq(deals.id, id));
  if (!deal) return null;

  const history: DealStageChange[] = await db
    .select({
      id: dealEvents.id,
      at: dealEvents.createdAt,
      fromStage: dealEvents.fromStage,
      toStage: dealEvents.toStage,
    })
    .from(dealEvents)
    .where(eq(dealEvents.dealId, id))
    .orderBy(desc(dealEvents.createdAt), desc(dealEvents.id));
  return { ...deal, history };
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

export type ClosingDeal = {
  id: number;
  title: string;
  stage: string;
  amountCents: number;
  billing: DealBilling;
  closeDate: string | null;
  companyId: number;
  companyName: string;
  business: Business;
};

// Open deals on active companies, soonest close date first and deals with no
// date last. Capped so a very large pipeline stays fast.
export const CLOSING_CAP = 300;

export async function listClosingDeals(
  filters: { business?: Business; q?: string } = {},
): Promise<ClosingDeal[]> {
  const db = getDb();
  return db
    .select({
      id: deals.id,
      title: deals.title,
      stage: deals.stage,
      amountCents: deals.amountCents,
      billing: deals.billing,
      closeDate: deals.closeDate,
      companyId: companies.id,
      companyName: companies.name,
      business: companies.business,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .where(
      and(
        isNull(companies.archivedAt),
        notInArray(deals.stage, ["won", "lost"]),
        filters.business ? eq(companies.business, filters.business) : undefined,
        filters.q
          ? sql`(${matches(deals.title, likePattern(filters.q))} or ${matches(companies.name, likePattern(filters.q))})`
          : undefined,
      ),
    )
    .orderBy(
      sql`${deals.closeDate} is null`,
      asc(deals.closeDate),
      desc(deals.amountCents),
    )
    .limit(CLOSING_CAP);
}

export type StalledDeal = ClosingDeal & {
  // When the deal entered its current stage: last stage change, else created.
  stageSince: string;
};

// Open deals on active companies, longest in their stage first. Capped so a
// very large pipeline stays fast.
export const STALLED_CAP = 300;

export async function listStalledDeals(
  filters: { business?: Business; q?: string } = {},
): Promise<StalledDeal[]> {
  const db = getDb();
  return db
    .select({
      id: deals.id,
      title: deals.title,
      stage: deals.stage,
      amountCents: deals.amountCents,
      billing: deals.billing,
      closeDate: deals.closeDate,
      companyId: companies.id,
      companyName: companies.name,
      business: companies.business,
      stageSince: sql<string>`coalesce((select max(${dealEvents.createdAt}) from ${dealEvents} where ${dealEvents.dealId} = ${deals.id}), ${deals.createdAt})`,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .where(
      and(
        isNull(companies.archivedAt),
        notInArray(deals.stage, ["won", "lost"]),
        filters.business ? eq(companies.business, filters.business) : undefined,
        filters.q
          ? sql`(${matches(deals.title, likePattern(filters.q))} or ${matches(companies.name, likePattern(filters.q))})`
          : undefined,
      ),
    )
    .orderBy(
      sql`coalesce((select max(${dealEvents.createdAt}) from ${dealEvents} where ${dealEvents.dealId} = ${deals.id}), ${deals.createdAt})`,
      desc(deals.amountCents),
    )
    .limit(STALLED_CAP);
}
