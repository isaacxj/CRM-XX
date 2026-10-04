"use client";

import { FormSheet } from "@/components/kit/form-sheet";
import { Field, Select, TextInput } from "@/components/ui/field";
import type { FormState } from "@/lib/form-state";
import { COMPANY_STATUSES, BUSINESSES } from "@/server/db/schema";

const BUSINESS_LABEL = { statixx: "Statixx", trazo: "Trazo" } as const;
const STATUS_LABEL = {
  prospect: "Prospect",
  client: "Client",
  past: "Past client",
} as const;

export function CompanySheet({
  action,
  closeHref,
  defaultBusiness,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  closeHref: string;
  defaultBusiness: (typeof BUSINESSES)[number];
}) {
  return (
    <FormSheet
      title="Add company"
      description="A prospect or client for Statixx or Trazo."
      closeHref={closeHref}
      action={action}
      submitLabel="Add company"
    >
      <Field label="Name" name="name">
        {(p) => <TextInput {...p} />}
      </Field>
      <Field label="Business" name="business">
        {(p) => (
          <Select {...p} defaultValue={defaultBusiness}>
            {BUSINESSES.map((b) => (
              <option key={b} value={b}>
                {BUSINESS_LABEL[b]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Status" name="status">
        {(p) => (
          <Select {...p} defaultValue="prospect">
            {COMPANY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Website" name="website">
        {(p) => <TextInput {...p} placeholder="https://example.com" />}
      </Field>
      <Field label="Source" name="source" hint="Where this lead came from.">
        {(p) => (
          <TextInput {...p} placeholder="Referral, website, conference…" />
        )}
      </Field>
    </FormSheet>
  );
}
