import { and, eq, inArray, isNull } from "drizzle-orm";

import { getDb } from "./index";
import {
  companies,
  dealEvents,
  deals,
  STATIXX_STAGES,
  TRAZO_STAGES,
  type Business,
  type DealStage,
} from "./schema";

export type FunnelStage = {
  stage: DealStage;
  reached: number;
  // Share of the previous stage's deals that got this far; null for the first.
  conversion: number | null;
  stillHere: number;
};

export type Funnel = {
  business: Business;
  stages: FunnelStage[];
  total: number;
  won: number;
  lost: number;
  avgDaysToWin: number | null;
};

const OPEN_STAGES: Record<Business, readonly DealStage[]> = {
  statixx: STATIXX_STAGES.filter((s) => s !== "won" && s !== "lost"),
  trazo: TRAZO_STAGES.filter((s) => s !== "won" && s !== "lost"),
};

const DAY_MS = 86_400_000;

function parseStamp(value: string) {
  // D1 timestamps are "YYYY-MM-DD HH:MM:SS" in UTC.
  return new Date(`${value.replace(" ", "T")}Z`).getTime();
}

// How far deals get through each business's pipeline. A deal counts as having
// reached a stage if it is there now, passed through it (stage history), or
// went on to a later stage; a won deal reached every stage. Archived companies
// are left out.
export async function getFunnels(business?: Business): Promise<Funnel[]> {
  const db = getDb();
  const businesses: Business[] = business ? [business] : ["statixx", "trazo"];

  const rows = await db
    .select({
      id: deals.id,
      business: companies.business,
      stage: deals.stage,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .where(
      and(
        isNull(companies.archivedAt),
        inArray(companies.business, businesses),
      ),
    );

  const events = rows.length
    ? await db
        .select({
          dealId: dealEvents.dealId,
          fromStage: dealEvents.fromStage,
          toStage: dealEvents.toStage,
        })
        .from(dealEvents)
        .where(
          inArray(
            dealEvents.dealId,
            rows.map((row) => row.id),
          ),
        )
    : [];
  const seen = new Map<number, Set<DealStage>>();
  for (const event of events) {
    const set = seen.get(event.dealId) ?? new Set<DealStage>();
    set.add(event.toStage);
    if (event.fromStage) set.add(event.fromStage);
    seen.set(event.dealId, set);
  }

  return businesses.map((biz) => {
    const open = OPEN_STAGES[biz];
    const mine = rows.filter((row) => row.business === biz);
    const reached = open.map(() => 0);
    const stillHere = open.map(() => 0);
    let won = 0;
    let lost = 0;
    const winDays: number[] = [];

    for (const deal of mine) {
      let furthest = -1;
      if (deal.stage === "won") {
        furthest = open.length - 1;
        won += 1;
        const days =
          (parseStamp(deal.updatedAt) - parseStamp(deal.createdAt)) / DAY_MS;
        if (Number.isFinite(days)) winDays.push(Math.max(0, days));
      } else {
        if (deal.stage === "lost") lost += 1;
        const stages = new Set<DealStage>(seen.get(deal.id) ?? []);
        stages.add(deal.stage);
        for (const stage of stages) {
          furthest = Math.max(furthest, open.indexOf(stage));
        }
        // Lost with no recorded history: it at least started in the first stage.
        if (furthest < 0) furthest = 0;
        const here = open.indexOf(deal.stage);
        if (here >= 0) stillHere[here] += 1;
      }
      for (let i = 0; i <= furthest; i += 1) reached[i] += 1;
    }

    return {
      business: biz,
      total: mine.length,
      won,
      lost,
      avgDaysToWin: winDays.length
        ? Math.round(winDays.reduce((a, b) => a + b, 0) / winDays.length)
        : null,
      stages: open.map((stage, i) => ({
        stage,
        reached: reached[i],
        stillHere: stillHere[i],
        conversion:
          i === 0
            ? null
            : reached[i - 1] === 0
              ? null
              : reached[i] / reached[i - 1],
      })),
    };
  });
}
