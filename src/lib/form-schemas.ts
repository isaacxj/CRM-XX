import { z } from "zod";

import {
  ACTIVITY_TYPES,
  BUSINESSES,
  COMPANY_STATUSES,
} from "@/server/db/schema";

// Empty strings from untouched inputs become null.
const optional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);

export const companyFormSchema = z.object({
  name: z.string().trim().min(1, "Enter the company name."),
  business: z.enum(BUSINESSES, { error: "Choose Statixx or Trazo." }),
  status: z.enum(COMPANY_STATUSES, { error: "Choose a status." }),
  website: optional,
  source: optional,
});

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, "Enter the contact's name."),
  title: optional,
  email: optional.refine(
    (v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    "Enter a valid email address, like name@company.com.",
  ),
  phone: optional,
});

const companyId = z.coerce
  .number({ error: "Choose a company from the list." })
  .int("Choose a company from the list.")
  .positive("Choose a company from the list.");

export const quickActivitySchema = z.object({
  companyId,
  type: z.enum(ACTIVITY_TYPES),
  subject: optional,
  body: optional,
  occurredAt: optional,
  endsAt: optional,
});

export const quickFollowUpSchema = z.object({
  companyId,
  title: z.string().trim().min(1, "Describe what needs to happen next."),
  dueDate: optional,
});
