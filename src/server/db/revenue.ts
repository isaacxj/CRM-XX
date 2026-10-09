import { eq, sql } from "drizzle-orm";

import { getDb } from "./index";
import { companies, dealEvents, deals, type Business } from "./schema";

export type Money = { oneTimeCents: number; monthlyCents: number };

export type Revenue = {
  pipeline: { stage: string; count: number; money: Money }[];
  wonThisMonth: { count: number; money: Money };
  wonThisQuarter: { count: number; money: Money };
  winRate: { won: number; lost: number; percent: number | null };
  previous: {
    wonMonthCents: number;
    wonQuarterCents: number;
    winRatePercent: number | null;
    mrrCents: number;
  };
  mrrByMonth: { month: string; cents: number }[];
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

/** Shifts a `YYYY-MM-01` date by whole months. */
function shiftMonth(date: string, months: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
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

  const prevMonthStart = shiftMonth(monthStart, -1);
  const prevQuarterStart = shiftMonth(quarterStart, -3);
  const ninetyToOneEighty = new Date(now.getTime() - 180 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const previous = {
    wonMonthCents: 0,
    wonQuarterCents: 0,
    winRatePercent: null as number | null,
    mrrCents: 0,
  };
  let wonPrev90 = 0;
  let lostPrev90 = 0;
  const monthlyWins: { closedOn: string; cents: number }[] = [];

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

    if (closedOn >= ninetyToOneEighty && closedOn < ninetyDaysAgo) {
      if (deal.stage === "won") wonPrev90 += 1;
      else lostPrev90 += 1;
    }

    if (deal.stage !== "won") continue;

    if (closedOn >= prevMonthStart && closedOn < monthStart) {
      previous.wonMonthCents += deal.amountCents;
    }
    if (closedOn >= prevQuarterStart && closedOn < quarterStart) {
      previous.wonQuarterCents += deal.amountCents;
    }
    if (deal.billing === "monthly" && deal.companyStatus !== "past") {
      monthlyWins.push({ closedOn, cents: deal.amountCents });
    }

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
  const prevDecided = wonPrev90 + lostPrev90;
  previous.winRatePercent =
    prevDecided === 0 ? null : Math.round((wonPrev90 / prevDecided) * 100);

  // MRR at the end of each of the last 12 months: monthly deals won by then.
  // Churn isn't tracked, so past clients are left out of every month.
  const mrrByMonth: Revenue["mrrByMonth"] = [];
  for (let back = 11; back >= 0; back--) {
    const start = shiftMonth(monthStart, -back);
    const end = shiftMonth(start, 1);
    mrrByMonth.push({
      month: start.slice(0, 7),
      cents: monthlyWins
        .filter((win) => win.closedOn < end)
        .reduce((sum, win) => sum + win.cents, 0),
    });
  }
  previous.mrrCents = mrrByMonth[10].cents;

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
    previous,
    mrrByMonth,
    mrrCents: mrrClients.reduce((sum, client) => sum + client.amountCents, 0),
    mrrClients,
  };
}

export type LostDeals = {
  total: number;
  valueCents: number;
  reasons: { reason: string; count: number; valueCents: number }[];
  recent: {
    id: number;
    title: string;
    companyId: number;
    companyName: string;
    amountCents: number;
    billing: string;
    reason: string | null;
    lostOn: string;
  }[];
};

/**
 * Lost deals for one business: a breakdown by reason (case-insensitive, so
 * "Price" and "price " group together) and the most recent losses. A deal is
 * lost on the day it entered Lost, falling back to its close date, then its
 * last update.
 */
export async function getLostDeals(
  business: Business,
  recentLimit = 8,
): Promise<LostDeals> {
  const db = getDb();
  const rows = await db
    .select({
      id: deals.id,
      title: deals.title,
      billing: deals.billing,
      amountCents: deals.amountCents,
      closeDate: deals.closeDate,
      updatedAt: deals.updatedAt,
      lostReason: deals.lostReason,
      companyId: companies.id,
      companyName: companies.name,
      enteredStage: sql<
        string | null
      >`(select max(${dealEvents.createdAt}) from ${dealEvents} where ${dealEvents.dealId} = ${deals.id} and ${dealEvents.toStage} = 'lost')`,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .where(
      sql`${companies.business} = ${business} and ${companies.archivedAt} is null and ${deals.stage} = 'lost'`,
    );

  const lost = rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      companyId: row.companyId,
      companyName: row.companyName,
      amountCents: row.amountCents,
      billing: row.billing,
      reason: row.lostReason?.trim() || null,
      lostOn: (row.enteredStage ?? row.closeDate ?? row.updatedAt).slice(0, 10),
    }))
    .sort((a, b) => b.lostOn.localeCompare(a.lostOn) || b.id - a.id);

  const groups = new Map<
    string,
    { reason: string; count: number; valueCents: number }
  >();
  for (const deal of lost) {
    const key = deal.reason?.toLowerCase() ?? "";
    const group = groups.get(key) ?? {
      reason: deal.reason ?? "No reason given",
      count: 0,
      valueCents: 0,
    };
    group.count += 1;
    group.valueCents += deal.amountCents;
    groups.set(key, group);
  }

  return {
    total: lost.length,
    valueCents: lost.reduce((sum, deal) => sum + deal.amountCents, 0),
    reasons: [...groups.values()].sort(
      (a, b) => b.count - a.count || b.valueCents - a.valueCents,
    ),
    recent: lost.slice(0, recentLimit),
  };
}
