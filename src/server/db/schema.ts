import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const BUSINESSES = ["statixx", "trazo"] as const;
export type Business = (typeof BUSINESSES)[number];

export const COMPANY_STATUSES = ["prospect", "client", "past"] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export const DEAL_BILLING = ["one_time", "monthly"] as const;
export type DealBilling = (typeof DEAL_BILLING)[number];

export const STATIXX_STAGES = [
  "qualified",
  "discovery",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
] as const;

export const TRAZO_STAGES = [
  "qualified",
  "discovery",
  "demo",
  "pilot",
  "proposal",
  "won",
  "lost",
] as const;

export type DealStage =
  (typeof STATIXX_STAGES)[number] | (typeof TRAZO_STAGES)[number];

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
};

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  business: text("business", { enum: BUSINESSES }).notNull(),
  name: text("name").notNull(),
  website: text("website"),
  status: text("status", { enum: COMPANY_STATUSES })
    .notNull()
    .default("prospect"),
  source: text("source"),
  archivedAt: text("archived_at"),
  ...timestamps,
});

export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  title: text("title"),
  ...timestamps,
});

export const deals = sqliteTable("deals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("qualified").$type<DealStage>(),
  amountCents: integer("amount_cents").notNull().default(0),
  billing: text("billing", { enum: DEAL_BILLING })
    .notNull()
    .default("one_time"),
  closeDate: text("close_date"),
  lostReason: text("lost_reason"),
  ...timestamps,
});

export const ACTIVITY_TYPES = [
  "note",
  "email_sent",
  "email_received",
  "call",
  "meeting",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id),
  contactId: integer("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  type: text("type", { enum: ACTIVITY_TYPES }).notNull().default("note"),
  subject: text("subject"),
  body: text("body").notNull().default(""),
  occurredAt: text("occurred_at").notNull(),
  // Meetings only: when it ends.
  endsAt: text("ends_at"),
  ownerEmail: text("owner_email"),
  // Logged from email: the Message-ID, and the first Message-ID in its thread,
  // so a reply can be matched to the email it answers.
  messageId: text("message_id"),
  threadId: text("thread_id"),
  ...timestamps,
});

export const TASK_KINDS = ["follow_up", "awaiting_reply"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").references(() => companies.id),
  title: text("title").notNull(),
  dueDate: text("due_date"),
  doneAt: text("done_at"),
  kind: text("kind", { enum: TASK_KINDS }).notNull().default("follow_up"),
  ownerEmail: text("owner_email"),
  // The sent email an awaiting_reply task is waiting on.
  activityId: integer("activity_id").references(() => activities.id, {
    onDelete: "cascade",
  }),
  ...timestamps,
});

export const dealEvents = sqliteTable("deal_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dealId: integer("deal_id")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  fromStage: text("from_stage").$type<DealStage>(),
  toStage: text("to_stage").notNull().$type<DealStage>(),
  ...timestamps,
});
