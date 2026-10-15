"use client";

import { FormSheet } from "@/components/kit/form-sheet";
import { DateField } from "@/components/kit/date-field";
import { Field, Select, TextInput } from "@/components/ui/field";
import type { FormState } from "@/lib/form-state";

export function DealSheet({
  action,
  closeHref,
  companyName,
  defaultBilling,
  billingOptions,
  defaultValues,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  closeHref: string;
  companyName: string;
  defaultBilling: string;
  billingOptions: { value: string; label: string }[];
  defaultValues?: {
    title: string;
    amountCents: number;
    billing: string;
    closeDate: string | null;
  };
}) {
  const editing = Boolean(defaultValues);
  return (
    <FormSheet
      title={editing ? `Edit ${defaultValues?.title}` : "Add deal"}
      description={`For ${companyName}.`}
      closeHref={closeHref}
      action={action}
      submitLabel={editing ? "Save deal" : "Add deal"}
    >
      <Field label="Deal" name="title">
        {(p) => (
          <TextInput
            {...p}
            defaultValue={defaultValues?.title}
            placeholder="Website redesign"
          />
        )}
      </Field>
      <Field label="Amount (USD)" name="amount">
        {(p) => (
          <TextInput
            {...p}
            inputMode="decimal"
            defaultValue={
              defaultValues ? String(defaultValues.amountCents / 100) : ""
            }
            placeholder="5000"
          />
        )}
      </Field>
      <Field label="Billing" name="billing">
        {(p) => (
          <Select
            {...p}
            defaultValue={defaultValues?.billing ?? defaultBilling}
          >
            {billingOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Expected close" name="closeDate">
        {(p) => (
          <DateField {...p} defaultValue={defaultValues?.closeDate ?? ""} />
        )}
      </Field>
    </FormSheet>
  );
}
