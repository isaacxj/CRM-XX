import { and, eq, isNotNull } from "drizzle-orm";

import { getDb } from "./index";
import {
  activities,
  dealEvents,
  deals,
  tasks,
  type ActivityType,
  type DealStage,
} from "./schema";

export type TimelineItem =
  | {
      kind: "activity";
      at: string;
      type: ActivityType;
      subject: string | null;
      body: string;
    }
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
  const [activityRows, taskRows, dealRows, eventRows] = await Promise.all([
    db.select().from(activities).where(eq(activities.companyId, companyId)),
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
    ...activityRows.map((a) => ({
      kind: "activity" as const,
      at: a.occurredAt,
      type: a.type,
      subject: a.subject,
      body: a.body,
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
