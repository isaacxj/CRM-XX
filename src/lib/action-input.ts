import { z } from "zod";

import {
  ACTIVITY_TYPES,
  COMPANY_STATUSES,
  DEAL_BILLING,
} from "@/server/db/schema";

// Schemas for the inline server actions (buttons and small forms on pages).
// Sheet forms use src/lib/form-schemas.ts and show per-field errors instead.

const text = z.string().trim();
const blank = (v: string) => (v === "" ? null : v);

export const recordId = z.coerce
  .number({ error: "That item is no longer available. Reload and try again." })
  .int("That item is no longer available. Reload and try again.")
  .positive("That item is no longer available. Reload and try again.");

export const optionalDate = text
  .transform(blank)
  .nullable()
  .optional()
  .transform((v) => v ?? null)
  .refine(
    (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
    "Enter the date as year-month-day, like 2026-03-31.",
  );

const optionalDateTime = text
  .transform(blank)
  .nullable()
  .optional()
  .transform((v) => v ?? null)
  .refine(
    (v) => v === null || !Number.isNaN(Date.parse(v)),
    "Enter a valid date and time.",
  );

export const idInput = z.object({ id: recordId });

export const snoozeInput = z.object({
  id: recordId,
  days: z.coerce
    .number()
    .refine((d) => [1, 3, 7].includes(d), "Pick tomorrow, 3 days, or a week."),
});

export const followUpInput = z.object({
  title: text.min(1, "Describe the follow-up before adding it."),
  dueDate: optionalDate,
  companyId: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine(
      (v) => v === null || (Number.isInteger(v) && v > 0),
      "Pick a company from the list, or leave it blank.",
    ),
});

export const dealInput = z.object({
  title: text.min(1, "Give the deal a title."),
  amount: z
    .string()
    .trim()
    .transform((v) => (v === "" ? 0 : Number(v.replace(/[$,\s]/g, ""))))
    .pipe(
      z
        .number({ error: "Enter the amount as a number, like 5000." })
        .finite("Enter the amount as a number, like 5000.")
        .min(0, "The amount can't be negative.")
        .max(1_000_000_000, "That amount is too large."),
    ),
  billing: z.enum(DEAL_BILLING, { error: "Choose one-time or monthly." }),
  closeDate: optionalDate,
});

export const logActivityInput = z.object({
  type: z.enum(ACTIVITY_TYPES).catch("note"),
  contactId: z.coerce.number().int().positive().nullable().catch(null),
  subject: text.catch(""),
  body: text.catch(""),
  occurredAt: optionalDateTime,
  endsAt: optionalDateTime,
  remindInDays: z.coerce
    .number()
    .int()
    .min(1, "Remind in at least 1 day.")
    .max(90, "Reminders can be at most 90 days out.")
    .nullable()
    .catch(null),
});

export const fieldUpdateInput = z.discriminatedUnion(
  "field",
  [
    z.object({
      field: z.literal("name"),
      value: text.min(1, "The company name can't be empty."),
    }),
    z.object({
      field: z.literal("website"),
      value: text.transform(blank),
    }),
    z.object({
      field: z.literal("source"),
      value: text.transform(blank),
    }),
    z.object({
      field: z.literal("status"),
      value: z.enum(COMPANY_STATUSES, { error: "Choose a status." }),
    }),
  ],
  { error: "That field can't be edited here." },
);

export function formObject(formData: FormData) {
  return Object.fromEntries(formData);
}

// First problem in a parsed result, phrased for the person who caused it.
export function firstProblem(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

// Adds the message the app shell shows as a toast (see FlashProblem).
export function withProblem(path: string, message: string) {
  const url = new URL(path, "http://local");
  url.searchParams.set("problem", message);
  return `${url.pathname}${url.search}`;
}
