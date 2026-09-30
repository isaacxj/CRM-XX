import { and, asc, eq, gte, isNotNull, isNull, lt } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";

import { getDb } from "./index";
import * as schema from "./schema";

const { activities, companies, tasks } = schema;

// Takes a db instead of calling getDb() so the alerts Worker, which has no
// vinext runtime, can use it too.
export type DigestDb = DrizzleD1Database<typeof schema>;

export type DigestItem = {
  title: string;
  companyId: number | null;
  companyName: string | null;
  // Due date (YYYY-MM-DD) for tasks, start time (UTC text) for meetings.
  when: string;
};

export type Digest = {
  ownerEmail: string;
  overdueFollowUps: DigestItem[];
  overdueReplies: DigestItem[];
  meetingsToday: DigestItem[];
};

export function isEmptyDigest(d: Digest) {
  return (
    d.overdueFollowUps.length === 0 &&
    d.overdueReplies.length === 0 &&
    d.meetingsToday.length === 0
  );
}

// One digest per owner who has something overdue or a meeting today. Items
// with no owner have nobody to email, so they're left out. Dates are UTC, like
// the rest of the app.
export async function buildDigests(
  db: DigestDb,
  now = new Date(),
  onlyOwner?: string,
): Promise<Digest[]> {
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dayStart = `${today} 00:00:00`;
  const dayEnd = `${tomorrow.toISOString().slice(0, 10)} 00:00:00`;

  const [overdue, meetings] = await Promise.all([
    db
      .select({
        title: tasks.title,
        kind: tasks.kind,
        dueDate: tasks.dueDate,
        ownerEmail: tasks.ownerEmail,
        companyId: tasks.companyId,
        companyName: companies.name,
      })
      .from(tasks)
      .leftJoin(companies, eq(tasks.companyId, companies.id))
      .where(
        and(
          isNull(tasks.doneAt),
          isNotNull(tasks.ownerEmail),
          lt(tasks.dueDate, today),
          onlyOwner ? eq(tasks.ownerEmail, onlyOwner) : undefined,
        ),
      )
      .orderBy(asc(tasks.dueDate), asc(tasks.id)),
    db
      .select({
        title: activities.subject,
        when: activities.occurredAt,
        ownerEmail: activities.ownerEmail,
        companyId: activities.companyId,
        companyName: companies.name,
      })
      .from(activities)
      .innerJoin(companies, eq(activities.companyId, companies.id))
      .where(
        and(
          eq(activities.type, "meeting"),
          isNotNull(activities.ownerEmail),
          gte(activities.occurredAt, dayStart),
          lt(activities.occurredAt, dayEnd),
          isNull(companies.archivedAt),
          onlyOwner ? eq(activities.ownerEmail, onlyOwner) : undefined,
        ),
      )
      .orderBy(asc(activities.occurredAt), asc(activities.id)),
  ]);

  const byOwner = new Map<string, Digest>();
  const digestFor = (email: string) => {
    let d = byOwner.get(email);
    if (!d) {
      d = {
        ownerEmail: email,
        overdueFollowUps: [],
        overdueReplies: [],
        meetingsToday: [],
      };
      byOwner.set(email, d);
    }
    return d;
  };

  for (const t of overdue) {
    const item = {
      title: t.title,
      companyId: t.companyId,
      companyName: t.companyName,
      when: t.dueDate ?? "",
    };
    const d = digestFor(t.ownerEmail!);
    (t.kind === "awaiting_reply" ? d.overdueReplies : d.overdueFollowUps).push(
      item,
    );
  }
  for (const m of meetings) {
    digestFor(m.ownerEmail!).meetingsToday.push({
      title: m.title || "Meeting",
      companyId: m.companyId,
      companyName: m.companyName,
      when: m.when,
    });
  }

  return [...byOwner.values()].sort((a, b) =>
    a.ownerEmail.localeCompare(b.ownerEmail),
  );
}

// For the in-app preview page.
export async function previewDigests(onlyOwner?: string) {
  return buildDigests(getDb(), new Date(), onlyOwner);
}

function line(item: DigestItem, appUrl: string, showTime: boolean) {
  const at = showTime ? item.when.slice(11, 16) + " UTC" : `due ${item.when}`;
  const who = item.companyName ? ` (${item.companyName})` : "";
  const link = item.companyId
    ? `\n    ${appUrl}/companies/${item.companyId}`
    : "";
  return `  - ${item.title}${who}, ${at}${link}`;
}

// Plain-text body; the subject counts everything that needs attention.
export function renderDigest(d: Digest, appUrl: string) {
  const count =
    d.overdueFollowUps.length +
    d.overdueReplies.length +
    d.meetingsToday.length;
  const sections: string[] = [];
  if (d.meetingsToday.length) {
    sections.push(
      `Meetings today\n${d.meetingsToday.map((i) => line(i, appUrl, true)).join("\n")}`,
    );
  }
  if (d.overdueFollowUps.length) {
    sections.push(
      `Overdue follow-ups\n${d.overdueFollowUps.map((i) => line(i, appUrl, false)).join("\n")}`,
    );
  }
  if (d.overdueReplies.length) {
    sections.push(
      `Still waiting on a reply\n${d.overdueReplies.map((i) => line(i, appUrl, false)).join("\n")}`,
    );
  }
  return {
    subject: `CRM-XX: ${count} ${count === 1 ? "item needs" : "items need"} your attention`,
    text: `${sections.join("\n\n")}\n\nOpen the CRM: ${appUrl}/tasks\n`,
  };
}
