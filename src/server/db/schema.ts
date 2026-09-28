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

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id),
  body: text("body").notNull(),
  ...timestamps,
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").references(() => companies.id),
  title: text("title").notNull(),
  dueDate: text("due_date"),
  doneAt: text("done_at"),
  ...timestamps,
});
