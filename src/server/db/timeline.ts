import { and, eq, isNotNull } from "drizzle-orm";

import { getDb } from "./index";
import { dealEvents, deals, notes, tasks, type DealStage } from "./schema";

export type TimelineItem =
  | { kind: "note"; at: string; body: string }
  | { kind: "task_done"; at: string; title: string }
  | { kind: "deal_created"; at: string; title: string }
  | {
      kind: "stage_change";
      at: string;
      dealTitle: string;
      fromStage: DealStage | null;
      toStage: DealStage;
    };

export async function listTimelineForCompany(
  companyId: number,
): Promise<TimelineItem[]> {
  const db = getDb();
  const [noteRows, taskRows, dealRows, eventRows] = await Promise.all([
    db.select().from(notes).where(eq(notes.companyId, companyId)),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.companyId, companyId), isNotNull(tasks.doneAt))),
    db.select().from(deals).where(eq(deals.companyId, companyId)),
    db
      .select({
        at: dealEvents.createdAt,
        fromStage: dealEvents.fromStage,
        toStage: dealEvents.toStage,
        dealTitle: deals.title,
      })
      .from(dealEvents)
      .innerJoin(deals, eq(dealEvents.dealId, deals.id))
      .where(eq(deals.companyId, companyId)),
  ]);

  const items: TimelineItem[] = [
    ...noteRows.map((n) => ({
      kind: "note" as const,
      at: n.createdAt,
      body: n.body,
    })),
    ...taskRows.map((t) => ({
      kind: "task_done" as const,
      at: t.doneAt as string,
      title: t.title,
    })),
    ...dealRows.map((d) => ({
      kind: "deal_created" as const,
      at: d.createdAt,
      title: d.title,
    })),
    ...eventRows.map((e) => ({ kind: "stage_change" as const, ...e })),
  ];

  // Timestamps are "YYYY-MM-DD HH:MM:SS" UTC text, so string order is time order.
  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
