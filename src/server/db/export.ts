import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "./index";
import {
  activities,
  companies,
  contacts,
  deals,
  tasks,
  type Business,
} from "./schema";

export const EXPORT_DATASETS = [
  "companies",
  "contacts",
  "deals",
  "activities",
  "tasks",
] as const;
export type ExportDataset = (typeof EXPORT_DATASETS)[number];

type Cell = string | number | null;
export type ExportTable = { header: string[]; rows: Cell[][] };

const cents = (value: number) => (value / 100).toFixed(2);

/**
 * Companies come out one row per contact (a company with no contacts gets one
 * row with blank contact cells), using the same headers the CSV importer
 * guesses, so the file can be imported straight back.
 */
async function exportCompanies(business?: Business): Promise<ExportTable> {
  const rows = await getDb()
    .select({
      name: companies.name,
      website: companies.website,
      status: companies.status,
      source: companies.source,
      contactName: contacts.name,
      contactEmail: contacts.email,
      contactPhone: contacts.phone,
      contactTitle: contacts.title,
    })
    .from(companies)
    .leftJoin(contacts, eq(contacts.companyId, companies.id))
    .where(
      and(
        isNull(companies.archivedAt),
        business ? eq(companies.business, business) : undefined,
      ),
    )
    .orderBy(asc(companies.business), asc(companies.name), asc(contacts.name));

  return {
    header: [
      "Company name",
      "Website",
      "Status",
      "Source",
      "Contact name",
      "Contact email",
      "Contact phone",
      "Contact title",
    ],
    rows: rows.map((r) => [
      r.name,
      r.website,
      r.status,
      r.source,
      r.contactName,
      r.contactEmail,
      r.contactPhone,
      r.contactTitle,
    ]),
  };
}

async function exportContacts(business?: Business): Promise<ExportTable> {
  const rows = await getDb()
    .select({
      business: companies.business,
      company: companies.name,
      name: contacts.name,
      email: contacts.email,
      phone: contacts.phone,
      title: contacts.title,
    })
    .from(contacts)
    .innerJoin(companies, eq(contacts.companyId, companies.id))
    .where(
      and(
        isNull(companies.archivedAt),
        business ? eq(companies.business, business) : undefined,
      ),
    )
    .orderBy(asc(companies.business), asc(companies.name), asc(contacts.name));

  return {
    header: ["Business", "Company", "Name", "Email", "Phone", "Title"],
    rows: rows.map((r) => [
      r.business,
      r.company,
      r.name,
      r.email,
      r.phone,
      r.title,
    ]),
  };
}

async function exportDeals(business?: Business): Promise<ExportTable> {
  const rows = await getDb()
    .select({
      business: companies.business,
      company: companies.name,
      title: deals.title,
      stage: deals.stage,
      amountCents: deals.amountCents,
      billing: deals.billing,
      closeDate: deals.closeDate,
      lostReason: deals.lostReason,
      createdAt: deals.createdAt,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .where(
      and(
        isNull(companies.archivedAt),
        business ? eq(companies.business, business) : undefined,
      ),
    )
    .orderBy(asc(companies.business), asc(companies.name), asc(deals.title));

  return {
    header: [
      "Business",
      "Company",
      "Deal",
      "Stage",
      "Amount (USD)",
      "Billing",
      "Close date",
      "Lost reason",
      "Created",
    ],
    rows: rows.map((r) => [
      r.business,
      r.company,
      r.title,
      r.stage,
      cents(r.amountCents),
      r.billing,
      r.closeDate,
      r.lostReason,
      r.createdAt,
    ]),
  };
}

async function exportActivities(business?: Business): Promise<ExportTable> {
  const rows = await getDb()
    .select({
      business: companies.business,
      company: companies.name,
      contact: contacts.name,
      type: activities.type,
      subject: activities.subject,
      body: activities.body,
      occurredAt: activities.occurredAt,
      endsAt: activities.endsAt,
      owner: activities.ownerEmail,
    })
    .from(activities)
    .innerJoin(companies, eq(activities.companyId, companies.id))
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .where(
      and(
        isNull(companies.archivedAt),
        business ? eq(companies.business, business) : undefined,
      ),
    )
    .orderBy(sql`${activities.occurredAt} desc`);

  return {
    header: [
      "Business",
      "Company",
      "Contact",
      "Type",
      "Subject",
      "Body",
      "Occurred at",
      "Ends at",
      "Owner",
    ],
    rows: rows.map((r) => [
      r.business,
      r.company,
      r.contact,
      r.type,
      r.subject,
      r.body,
      r.occurredAt,
      r.endsAt,
      r.owner,
    ]),
  };
}

// Tasks may have no company; with a business filter only that business's
// tasks are exported, so standalone tasks appear in the "all" export only.
async function exportTasks(business?: Business): Promise<ExportTable> {
  const rows = await getDb()
    .select({
      business: companies.business,
      company: companies.name,
      title: tasks.title,
      kind: tasks.kind,
      dueDate: tasks.dueDate,
      doneAt: tasks.doneAt,
      owner: tasks.ownerEmail,
    })
    .from(tasks)
    .leftJoin(companies, eq(tasks.companyId, companies.id))
    .where(
      business
        ? and(isNull(companies.archivedAt), eq(companies.business, business))
        : undefined,
    )
    .orderBy(sql`${tasks.dueDate} is null`, asc(tasks.dueDate), asc(tasks.id));

  return {
    header: ["Business", "Company", "Task", "Kind", "Due", "Done at", "Owner"],
    rows: rows.map((r) => [
      r.business,
      r.company,
      r.title,
      r.kind,
      r.dueDate,
      r.doneAt,
      r.owner,
    ]),
  };
}

export function exportDataset(
  dataset: ExportDataset,
  business?: Business,
): Promise<ExportTable> {
  switch (dataset) {
    case "companies":
      return exportCompanies(business);
    case "contacts":
      return exportContacts(business);
    case "deals":
      return exportDeals(business);
    case "activities":
      return exportActivities(business);
    case "tasks":
      return exportTasks(business);
  }
}
