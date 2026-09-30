import { eq, sql } from "drizzle-orm";

import { getDb } from "./index";
import { companies, dealEvents, deals, type Business } from "./schema";

export type Money = { oneTimeCents: number; monthlyCents: number };

export type Revenue = {
  pipeline: { stage: string; count: number; money: Money }[];
  wonThisMonth: { count: number; money: Money };
  wonThisQuarter: { count: number; money: Money };
  winRate: { won: number; lost: number; percent: number | null };
  mrrCents: number;
  mrrClients: {
    companyId: number;
    companyName: string;
    dealTitle: string;
    amountCents: number;
  }[];
};

const emptyMoney = (): Money => ({ oneTimeCents: 0, monthlyCents: 0 });

function addMoney(money: Money, billing: string, cents: number) {
  if (billing === "monthly") money.monthlyCents += cents;
  else money.oneTimeCents += cents;
}

/**
 * Revenue numbers for one business, computed from deals and their stage
 * history. A deal counts as won or lost on the day it entered that stage
 * (latest deal_events row), falling back to its close date, then last update.
 * `now` is injectable so the date windows can be tested.
 */
export async function getRevenue(
  business: Business,
  now: Date = new Date(),
): Promise<Revenue> {
  const db = getDb();
  const rows = await db
    .select({
      id: deals.id,
      title: deals.title,
      stage: deals.stage,
      billing: deals.billing,
      amountCents: deals.amountCents,
      closeDate: deals.closeDate,
      updatedAt: deals.updatedAt,
      companyId: companies.id,
      companyName: companies.name,
      companyStatus: companies.status,
      enteredStage: sql<
        string | null
      >`(select max(${dealEvents.createdAt}) from ${dealEvents} where ${dealEvents.dealId} = ${deals.id} and ${dealEvents.toStage} = ${deals.stage})`,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .where(
      sql`${companies.business} = ${business} and ${companies.archivedAt} is null`,
    );

  const today = now.toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const quarterMonth = Math.floor(now.getUTCMonth() / 3) * 3 + 1;
  const quarterStart = `${now.getUTCFullYear()}-${String(quarterMonth).padStart(2, "0")}-01`;
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const pipeline = new Map<string, { count: number; money: Money }>();
  const wonThisMonth = { count: 0, money: emptyMoney() };
  const wonThisQuarter = { count: 0, money: emptyMoney() };
  let won90 = 0;
  let lost90 = 0;
  const mrrClients: Revenue["mrrClients"] = [];

  for (const deal of rows) {
    if (deal.stage !== "won" && deal.stage !== "lost") {
      const entry = pipeline.get(deal.stage) ?? {
        count: 0,
        money: emptyMoney(),
      };
      entry.count += 1;
      addMoney(entry.money, deal.billing, deal.amountCents);
      pipeline.set(deal.stage, entry);
      continue;
    }

    const closedOn = (
      deal.enteredStage ??
      deal.closeDate ??
      deal.updatedAt
    ).slice(0, 10);

    if (closedOn >= ninetyDaysAgo && closedOn <= today) {
      if (deal.stage === "won") won90 += 1;
      else lost90 += 1;
    }

    if (deal.stage !== "won") continue;

    if (closedOn >= monthStart && closedOn <= today) {
      wonThisMonth.count += 1;
      addMoney(wonThisMonth.money, deal.billing, deal.amountCents);
    }
    if (closedOn >= quarterStart && closedOn <= today) {
      wonThisQuarter.count += 1;
      addMoney(wonThisQuarter.money, deal.billing, deal.amountCents);
    }
    if (deal.billing === "monthly" && deal.companyStatus !== "past") {
      mrrClients.push({
        companyId: deal.companyId,
        companyName: deal.companyName,
        dealTitle: deal.title,
        amountCents: deal.amountCents,
      });
    }
  }

  mrrClients.sort((a, b) => b.amountCents - a.amountCents);
  const decided = won90 + lost90;

  return {
    pipeline: [...pipeline.entries()].map(([stage, value]) => ({
      stage,
      ...value,
    })),
    wonThisMonth,
    wonThisQuarter,
    winRate: {
      won: won90,
      lost: lost90,
      percent: decided === 0 ? null : Math.round((won90 / decided) * 100),
    },
    mrrCents: mrrClients.reduce((sum, client) => sum + client.amountCents, 0),
    mrrClients,
  };
}
