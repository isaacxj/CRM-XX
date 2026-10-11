import { and, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";

import { getDb } from "./index";
import {
  activities,
  companies,
  dealEvents,
  deals,
  tasks,
  type ActivityType,
  type Business,
} from "./schema";

export const REVIEW_PERIODS = [7, 14, 30] as const;
export type ReviewPeriod = (typeof REVIEW_PERIODS)[number];

export type ReviewDeal = {
  dealId: number;
  title: string;
  companyId: number;
  companyName: string;
  business: Business;
  amountCents: number;
  billing: "one_time" | "monthly";
  lostReason: string | null;
  at: string;
};

export type Review = {
  since: string;
  newCompanies: { id: number; name: string; business: Business }[];
  newDeals: number;
  won: ReviewDeal[];
  lost: ReviewDeal[];
  activityByType: Record<ActivityType, number>;
  followUpsDone: {
    id: number;
    title: string;
    companyId: number | null;
    companyName: string | null;
    doneAt: string;
  }[];
  followUpsAdded: number;
};

// A look back over the last N days: companies added, deals created, won and
// lost, what was logged by type, and follow-ups completed. A deal counts as won
// or lost on the day its stage change was recorded. With a business, only
// that business's companies count.
export async function getReview(
  days: ReviewPeriod,
  business?: Business,
  now = new Date(),
): Promise<Review> {
  const db = getDb();
  const stamp = (date: Date) =>
    date.toISOString().slice(0, 19).replace("T", " ");
  const since = stamp(new Date(now.getTime() - days * 86_400_000));
  const until = stamp(now);
  const scoped = business ? eq(companies.business, business) : undefined;

  const [newCompanies, newDealCount, outcomes, byType, done, added] =
    await Promise.all([
      db
        .select({
          id: companies.id,
          name: companies.name,
          business: companies.business,
        })
        .from(companies)
        .where(and(gte(companies.createdAt, since), scoped))
        .orderBy(desc(companies.createdAt))
        .limit(50),
      db
        .select({ n: sql<number>`count(*)` })
        .from(deals)
        .innerJoin(companies, eq(deals.companyId, companies.id))
        .where(and(gte(deals.createdAt, since), scoped)),
      db
        .select({
          dealId: deals.id,
          title: deals.title,
          companyId: companies.id,
          companyName: companies.name,
          business: companies.business,
          amountCents: deals.amountCents,
          billing: deals.billing,
          lostReason: deals.lostReason,
          stage: deals.stage,
          at: dealEvents.createdAt,
        })
        .from(dealEvents)
        .innerJoin(deals, eq(dealEvents.dealId, deals.id))
        .innerJoin(companies, eq(deals.companyId, companies.id))
        .where(
          and(
            gte(dealEvents.createdAt, since),
            // Only deals still in the stage they were moved to.
            sql`${dealEvents.toStage} = ${deals.stage}`,
            sql`${deals.stage} in ('won', 'lost')`,
            scoped,
          ),
        )
        .orderBy(desc(dealEvents.createdAt)),
      db
        .select({ type: activities.type, n: sql<number>`count(*)` })
        .from(activities)
        .innerJoin(companies, eq(activities.companyId, companies.id))
        .where(
          and(
            gte(activities.occurredAt, since),
            lt(activities.occurredAt, until),
            scoped,
          ),
        )
        .groupBy(activities.type),
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          companyId: tasks.companyId,
          companyName: companies.name,
          doneAt: tasks.doneAt,
        })
        .from(tasks)
        .leftJoin(companies, eq(tasks.companyId, companies.id))
        .where(
          and(
            eq(tasks.kind, "follow_up"),
            isNotNull(tasks.doneAt),
            gte(tasks.doneAt, since),
            scoped,
          ),
        )
        .orderBy(desc(tasks.doneAt))
        .limit(50),
      db
        .select({ n: sql<number>`count(*)` })
        .from(tasks)
        .leftJoin(companies, eq(tasks.companyId, companies.id))
        .where(
          and(eq(tasks.kind, "follow_up"), gte(tasks.createdAt, since), scoped),
        ),
    ]);

  const won: ReviewDeal[] = [];
  const lost: ReviewDeal[] = [];
  const seen = new Set<number>();
  for (const o of outcomes) {
    if (seen.has(o.dealId)) continue;
    seen.add(o.dealId);
    const { stage, ...deal } = o;
    (stage === "won" ? won : lost).push(deal);
  }

  const activityByType: Record<ActivityType, number> = {
    note: 0,
    email_sent: 0,
    email_received: 0,
    call: 0,
    meeting: 0,
  };
  for (const row of byType) activityByType[row.type] = Number(row.n);

  return {
    since,
    newCompanies,
    newDeals: Number(newDealCount[0]?.n ?? 0),
    won,
    lost,
    activityByType,
    followUpsDone: done.map((d) => ({ ...d, doneAt: d.doneAt as string })),
    followUpsAdded: Number(added[0]?.n ?? 0),
  };
}
