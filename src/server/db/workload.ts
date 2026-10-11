import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { getDb } from "./index";
import { activities, companies, tasks, type Business } from "./schema";

export type WorkloadRow = {
  ownerEmail: string | null;
  openFollowUps: number;
  overdueFollowUps: number;
  waitingOnReply: number;
  overdueReplies: number;
  meetingsNextWeek: number;
  loggedLastWeek: number;
};

function emptyRow(ownerEmail: string | null): WorkloadRow {
  return {
    ownerEmail,
    openFollowUps: 0,
    overdueFollowUps: 0,
    waitingOnReply: 0,
    overdueReplies: 0,
    meetingsNextWeek: 0,
    loggedLastWeek: 0,
  };
}

// What each person has on their plate: open follow-ups and waiting-on-reply
// emails (with how many are overdue), meetings in the next 7 days, and what
// they logged in the last 7 days. Items with no owner are grouped together.
// With a business, only items on that business's companies count.
export async function getWorkload(
  business?: Business,
  now = new Date(),
): Promise<WorkloadRow[]> {
  const db = getDb();
  const today = now.toISOString().slice(0, 10);
  const stamp = (date: Date) =>
    date.toISOString().slice(0, 19).replace("T", " ");
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

  const [taskCounts, activityCounts] = await Promise.all([
    db
      .select({
        ownerEmail: tasks.ownerEmail,
        kind: tasks.kind,
        open: sql<number>`count(*)`,
        overdue: sql<number>`coalesce(sum(case when ${tasks.dueDate} < ${today} then 1 else 0 end), 0)`,
      })
      .from(tasks)
      .leftJoin(companies, eq(tasks.companyId, companies.id))
      .where(
        and(
          isNull(tasks.doneAt),
          business ? eq(companies.business, business) : undefined,
        ),
      )
      .groupBy(tasks.ownerEmail, tasks.kind),
    db
      .select({
        ownerEmail: activities.ownerEmail,
        meetings: sql<number>`coalesce(sum(case when ${activities.type} = 'meeting' and ${activities.occurredAt} >= ${stamp(now)} and ${activities.occurredAt} < ${stamp(weekAhead)} then 1 else 0 end), 0)`,
        logged: sql<number>`coalesce(sum(case when ${activities.type} != 'meeting' and ${activities.occurredAt} >= ${stamp(weekAgo)} and ${activities.occurredAt} <= ${stamp(now)} then 1 else 0 end), 0)`,
      })
      .from(activities)
      .innerJoin(companies, eq(activities.companyId, companies.id))
      .where(
        and(
          gte(activities.occurredAt, stamp(weekAgo)),
          lt(activities.occurredAt, stamp(weekAhead)),
          business ? eq(companies.business, business) : undefined,
        ),
      )
      .groupBy(activities.ownerEmail),
  ]);

  const rows = new Map<string, WorkloadRow>();
  const rowFor = (owner: string | null) => {
    const key = owner ?? "";
    let row = rows.get(key);
    if (!row) rows.set(key, (row = emptyRow(owner)));
    return row;
  };

  for (const t of taskCounts) {
    const row = rowFor(t.ownerEmail);
    if (t.kind === "awaiting_reply") {
      row.waitingOnReply += Number(t.open);
      row.overdueReplies += Number(t.overdue);
    } else {
      row.openFollowUps += Number(t.open);
      row.overdueFollowUps += Number(t.overdue);
    }
  }
  for (const a of activityCounts) {
    const row = rowFor(a.ownerEmail);
    row.meetingsNextWeek += Number(a.meetings);
    row.loggedLastWeek += Number(a.logged);
  }

  // Most overdue first, then busiest; people with nothing to do sink.
  return [...rows.values()]
    .filter(
      (r) =>
        r.openFollowUps +
          r.waitingOnReply +
          r.meetingsNextWeek +
          r.loggedLastWeek >
        0,
    )
    .sort(
      (a, b) =>
        b.overdueFollowUps +
          b.overdueReplies -
          (a.overdueFollowUps + a.overdueReplies) ||
        b.openFollowUps +
          b.waitingOnReply -
          (a.openFollowUps + a.waitingOnReply),
    );
}
