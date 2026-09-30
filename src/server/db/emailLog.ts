import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";

import {
  addresses,
  header,
  messageIds,
  parseInvite,
  parseMessage,
  type ParsedMessage,
} from "@/lib/mime";

import type { DigestDb } from "./digest";
import * as schema from "./schema";

const { activities, companies, contacts, tasks } = schema;

export type LogOptions = {
  // Addresses that count as the team, on top of anyone who already owns a task
  // or activity.
  teamEmails: string[];
  // Days until an outbound email's waiting-on-reply reminder is due.
  remindInDays?: number;
};

export type LogResult =
  | { action: "email_sent" | "email_received" | "meeting"; activityId: number }
  | { action: "ignored"; reason: string }
  | { action: "verification" };

// Gmail sends this to the forwarding address to confirm it; a person has to
// click the link in it, so it is passed on rather than logged.
function isForwardingVerification(msg: ParsedMessage) {
  return (
    /forwarding-noreply@google\.com/i.test(header(msg, "from")) ||
    /gmail forwarding confirmation/i.test(header(msg, "subject"))
  );
}

function ignored(reason: string): LogResult {
  return { action: "ignored", reason };
}

function nowUtc() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function addDays(date: string, days: number) {
  const d = new Date(`${date.replace(" ", "T")}Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function loadTeam(db: DigestDb, extra: string[]) {
  const [taskOwners, activityOwners] = await Promise.all([
    db.selectDistinct({ email: tasks.ownerEmail }).from(tasks),
    db.selectDistinct({ email: activities.ownerEmail }).from(activities),
  ]);
  const team = new Set(
    extra.map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
  for (const row of [...taskOwners, ...activityOwners]) {
    if (row.email) team.add(row.email.toLowerCase());
  }
  return team;
}

// The first contact (at a company that isn't archived) with one of these emails.
async function findContact(db: DigestDb, emails: string[]) {
  if (emails.length === 0) return null;
  const [row] = await db
    .select({ id: contacts.id, companyId: contacts.companyId })
    .from(contacts)
    .innerJoin(companies, eq(contacts.companyId, companies.id))
    .where(
      and(
        inArray(sql`lower(${contacts.email})`, emails),
        isNull(companies.archivedAt),
      ),
    )
    .orderBy(contacts.id)
    .limit(1);
  return row ?? null;
}

// Reads one raw email sent to the logging address and records what it means.
// Only the alerts Worker calls this; the app just shows the activities it
// creates.
export async function logInboundEmail(
  db: DigestDb,
  raw: string,
  opts: LogOptions,
): Promise<LogResult> {
  const outer = parseMessage(raw);
  if (isForwardingVerification(outer)) return { action: "verification" };

  const team = await loadTeam(db, opts.teamEmails);
  const forwarder = addresses(header(outer, "from"))[0] ?? "";
  // A message forwarded as an attachment carries the original inside.
  const inner = outer.attached ?? outer;

  const ownMessageId = messageIds(header(inner, "message-id"))[0] ?? null;
  const refs = [
    ...messageIds(header(inner, "in-reply-to")),
    ...messageIds(header(inner, "references")),
    ...messageIds(header(outer, "in-reply-to")),
    ...messageIds(header(outer, "references")),
  ];

  const [thread] = refs.length
    ? await db
        .select({
          companyId: activities.companyId,
          contactId: activities.contactId,
          messageId: activities.messageId,
          threadId: activities.threadId,
        })
        .from(activities)
        .where(
          or(
            inArray(activities.messageId, refs),
            inArray(activities.threadId, refs),
          ),
        )
        .orderBy(activities.id)
        .limit(1)
    : [];

  const fromTeam = team.has(forwarder);
  if (!fromTeam && !thread) {
    return ignored("Not from a team address and not part of a known thread.");
  }

  const ownerEmail = fromTeam ? forwarder : null;
  const innerFrom = addresses(header(inner, "from"))[0] ?? forwarder;
  const subject = header(inner, "subject") || null;
  const body = inner.text.slice(0, 4000);

  // Calendar invites become meetings, matched to a contact by attendee.
  if (outer.calendar ?? inner.calendar) {
    if (!fromTeam) return ignored("Calendar invites must come from the team.");
    const invite = parseInvite((outer.calendar ?? inner.calendar) as string);
    if (!invite) return ignored("The calendar invite has no start time.");
    if (invite.cancelled) return ignored("The meeting was cancelled.");
    const uid = invite.uid ? `ics:${invite.uid}` : null;
    if (uid) {
      const [existing] = await db
        .select({ id: activities.id })
        .from(activities)
        .where(eq(activities.messageId, uid));
      if (existing) return ignored("This invite is already logged.");
    }
    const contact = await findContact(
      db,
      invite.attendees.filter((a) => !team.has(a)),
    );
    if (!contact) return ignored("No attendee matches a contact.");
    const [row] = await db
      .insert(activities)
      .values({
        companyId: contact.companyId,
        contactId: contact.id,
        type: "meeting",
        subject: invite.summary ?? subject,
        body: "",
        occurredAt: invite.start,
        endsAt: invite.end && invite.end > invite.start ? invite.end : null,
        ownerEmail,
        messageId: uid,
      })
      .returning({ id: activities.id });
    return { action: "meeting", activityId: row.id };
  }

  if (ownMessageId) {
    const [existing] = await db
      .select({ id: activities.id })
      .from(activities)
      .where(eq(activities.messageId, ownMessageId));
    if (existing) return ignored("This email is already logged.");
  }

  // The team wrote it: a BCC'd outbound email, logged on the recipient's company.
  if (team.has(innerFrom)) {
    const recipients = [
      ...addresses(header(inner, "to")),
      ...addresses(header(inner, "cc")),
    ].filter((a) => !team.has(a));
    const contact = await findContact(db, recipients);
    const companyId = contact?.companyId ?? thread?.companyId;
    if (!companyId) return ignored("No recipient matches a contact.");
    const threadId =
      thread?.threadId ?? thread?.messageId ?? refs[0] ?? ownMessageId;
    const occurredAt = nowUtc();
    const days = opts.remindInDays ?? 3;
    // The email and its reminder land together or not at all.
    const [inserted] = await db.batch([
      db
        .insert(activities)
        .values({
          companyId,
          contactId: contact?.id ?? thread?.contactId ?? null,
          type: "email_sent",
          subject,
          body,
          occurredAt,
          ownerEmail: team.has(forwarder) ? forwarder : innerFrom,
          messageId: ownMessageId,
          threadId,
        })
        .returning({ id: activities.id }),
      db.insert(tasks).values({
        companyId,
        title: `Waiting on reply${subject ? `: ${subject}` : ""}`,
        dueDate: addDays(occurredAt, days),
        kind: "awaiting_reply",
        ownerEmail: team.has(forwarder) ? forwarder : innerFrom,
        activityId: sql`last_insert_rowid()`,
      }),
    ]);
    return { action: "email_sent", activityId: inserted[0].id };
  }

  // Someone else wrote it: a reply, matched by its headers or by the sender.
  const contact = thread?.contactId
    ? { id: thread.contactId, companyId: thread.companyId }
    : await findContact(db, [innerFrom]);
  const companyId = thread?.companyId ?? contact?.companyId;
  if (!companyId) return ignored("The sender doesn't match a contact.");
  const threadId = thread?.threadId ?? thread?.messageId ?? null;
  const [inserted] = await db.batch([
    db
      .insert(activities)
      .values({
        companyId,
        contactId: contact?.id ?? null,
        type: "email_received",
        subject,
        body,
        occurredAt: nowUtc(),
        ownerEmail,
        messageId: ownMessageId,
        threadId,
      })
      .returning({ id: activities.id }),
    // Close the reminders this reply answers: the thread's, or the company's.
    db
      .update(tasks)
      .set({
        doneAt: sql`(current_timestamp)`,
        updatedAt: sql`(current_timestamp)`,
      })
      .where(
        and(
          eq(tasks.kind, "awaiting_reply"),
          isNull(tasks.doneAt),
          eq(tasks.companyId, companyId),
          threadId
            ? inArray(
                tasks.activityId,
                db
                  .select({ id: activities.id })
                  .from(activities)
                  .where(
                    or(
                      eq(activities.threadId, threadId),
                      eq(activities.messageId, threadId),
                    ),
                  ),
              )
            : undefined,
        ),
      ),
  ]);
  return { action: "email_received", activityId: inserted[0].id };
}
