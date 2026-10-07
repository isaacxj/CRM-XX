"use client";

import {
  CompanyPicker,
  type PickerCompany,
} from "@/components/kit/company-picker";
import { DateField } from "@/components/kit/date-field";
import { FormSheet } from "@/components/kit/form-sheet";
import { Field, TextInput } from "@/components/ui/field";
import type { FormState } from "@/lib/form-state";

// Add a follow-up. On the Tasks page `companies` lets the person attach a
// company or leave it blank; on a company page the company is fixed.
export function TaskSheet({
  action,
  closeHref,
  companyName,
  companies,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  closeHref: string;
  companyName?: string;
  companies?: PickerCompany[];
}) {
  return (
    <FormSheet
      title="Add follow-up"
      description={
        companyName ? `For ${companyName}.` : "What needs to happen next."
      }
      closeHref={closeHref}
      action={action}
      submitLabel="Add follow-up"
    >
      <Field label="What's next" name="title">
        {(p) => <TextInput {...p} placeholder="Send proposal" />}
      </Field>
      {companies && (
        <Field
          label="Company"
          name="companyId"
          hint="Optional. Leave blank for a task that isn't about one company."
        >
          {(p) => <CompanyPicker companies={companies} {...p} />}
        </Field>
      )}
      <Field label="Due" name="dueDate">
        {(p) => <DateField {...p} />}
      </Field>
    </FormSheet>
  );
}
