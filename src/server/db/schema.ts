import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

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

export const companies = sqliteTable(
  "companies",
  {
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
  },
  (t) => [index("companies_business_idx").on(t.business, t.archivedAt)],
);

export const contacts = sqliteTable(
  "contacts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    title: text("title"),
    ...timestamps,
  },
  (t) => [
    index("contacts_company_idx").on(t.companyId),
    index("contacts_email_idx").on(t.email),
  ],
);

export const deals = sqliteTable(
  "deals",
  {
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
  },
  (t) => [
    index("deals_company_idx").on(t.companyId),
    index("deals_stage_idx").on(t.stage),
  ],
);

export const ACTIVITY_TYPES = [
  "note",
  "email_sent",
  "email_received",
  "call",
  "meeting",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const activities = sqliteTable(
  "activities",
  {
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
  },
  (t) => [
    index("activities_company_idx").on(t.companyId, t.occurredAt),
    index("activities_thread_idx").on(t.threadId),
  ],
);

export const TASK_KINDS = ["follow_up", "awaiting_reply"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const tasks = sqliteTable(
  "tasks",
  {
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
  },
  (t) => [
    index("tasks_company_idx").on(t.companyId),
    index("tasks_open_idx").on(t.doneAt, t.dueDate),
    index("tasks_activity_idx").on(t.activityId),
  ],
);

export const dealEvents = sqliteTable(
  "deal_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    dealId: integer("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    fromStage: text("from_stage").$type<DealStage>(),
    toStage: text("to_stage").notNull().$type<DealStage>(),
    ...timestamps,
  },
  (t) => [index("deal_events_deal_idx").on(t.dealId)],
);

export const SAVED_VIEW_SCOPES = ["companies", "deals"] as const;
export type SavedViewScope = (typeof SAVED_VIEW_SCOPES)[number];

// A named filter combination for a list page. `query` is the page's search
// string (for example business, status, q, sort, dir) without a leading "?".
export const savedViews = sqliteTable(
  "saved_views",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scope: text("scope", { enum: SAVED_VIEW_SCOPES }).notNull(),
    name: text("name").notNull(),
    query: text("query").notNull(),
    ...timestamps,
  },
  (t) => [index("saved_views_scope_idx").on(t.scope)],
);

// Companies a person pinned to the sidebar. Pins belong to the signed-in email.
export const companyPins = sqliteTable(
  "company_pins",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    ownerEmail: text("owner_email").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("company_pins_owner_company_idx").on(t.ownerEmail, t.companyId),
  ],
);

// The last time a person opened a company page, for the palette's recents.
export const companyViews = sqliteTable(
  "company_views",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    ownerEmail: text("owner_email").notNull(),
    viewedAt: text("viewed_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => [
    uniqueIndex("company_views_owner_company_idx").on(
      t.ownerEmail,
      t.companyId,
    ),
  ],
);
