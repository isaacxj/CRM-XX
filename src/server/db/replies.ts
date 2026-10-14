import { and, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "./index";
import { likePattern, matches } from "./search";
import { activities, companies, contacts, type Business } from "./schema";

// Max rows on the Reply due page.
export const REPLY_DUE_CAP = 300;

// Emails received that nobody has answered: for each active company, its
// latest received email, kept only when no email has been sent on that
// company at or after it. Oldest first, so the longest wait is on top.
export async function listRepliesDue(
  filters: { business?: Business; q?: string } = {},
  now = new Date(),
) {
  const db = getDb();
  const stamp = now.toISOString().slice(0, 19).replace("T", " ");
  const latest = sql`(
    select max(a2.occurred_at) from activities a2
    where a2.company_id = ${activities.companyId}
      and a2.type = 'email_received' and a2.occurred_at <= ${stamp}
  )`;
  return db
    .select({
      activityId: activities.id,
      companyId: companies.id,
      companyName: companies.name,
      business: companies.business,
      subject: activities.subject,
      body: activities.body,
      receivedAt: activities.occurredAt,
      contactName: contacts.name,
      openReplyTasks: sql<number>`(
        select count(*) from tasks
        where company_id = ${companies.id} and done_at is null
          and title like 'Reply to%'
      )`,
    })
    .from(activities)
    .innerJoin(companies, eq(activities.companyId, companies.id))
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .where(
      and(
        isNull(companies.archivedAt),
        eq(activities.type, "email_received"),
        sql`${activities.occurredAt} = ${latest}`,
        sql`not exists (
          select 1 from activities s
          where s.company_id = ${activities.companyId}
            and s.type = 'email_sent'
            and s.occurred_at >= ${activities.occurredAt}
        )`,
        filters.business ? eq(companies.business, filters.business) : undefined,
        filters.q ? matches(companies.name, likePattern(filters.q)) : undefined,
      ),
    )
    .orderBy(activities.occurredAt, companies.name)
    .limit(REPLY_DUE_CAP);
}
