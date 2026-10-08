"use client";

import { FormSheet } from "@/components/kit/form-sheet";
import { Field, TextInput } from "@/components/ui/field";
import type { FormState } from "@/lib/form-state";

export function ContactSheet({
  action,
  closeHref,
  companyName,
  defaultValues,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  closeHref: string;
  companyName: string;
  defaultValues?: {
    name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
  };
}) {
  const editing = Boolean(defaultValues);
  return (
    <FormSheet
      title={editing ? `Edit ${defaultValues?.name}` : "Add contact"}
      description={`At ${companyName}.`}
      closeHref={closeHref}
      action={action}
      submitLabel={editing ? "Save contact" : "Add contact"}
    >
      <Field label="Name" name="name">
        {(p) => <TextInput {...p} defaultValue={defaultValues?.name} />}
      </Field>
      <Field label="Title" name="title">
        {(p) => (
          <TextInput
            {...p}
            defaultValue={defaultValues?.title ?? ""}
            placeholder="Head of Operations"
          />
        )}
      </Field>
      <Field label="Email" name="email">
        {(p) => (
          <TextInput
            {...p}
            type="email"
            defaultValue={defaultValues?.email ?? ""}
          />
        )}
      </Field>
      <Field label="Phone" name="phone">
        {(p) => (
          <TextInput
            {...p}
            type="tel"
            defaultValue={defaultValues?.phone ?? ""}
          />
        )}
      </Field>
    </FormSheet>
  );
}
