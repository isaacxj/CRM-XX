"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  addFollowUpAction,
  listPickerCompanies,
  logActivityAction,
} from "@/app/form-actions";
import {
  CompanyPicker,
  type PickerCompany,
} from "@/components/kit/company-picker";
import { DateField } from "@/components/kit/date-field";
import { FormSheet } from "@/components/kit/form-sheet";
import { Field, Select, Textarea, TextInput } from "@/components/ui/field";
import { ACTIVITY_TYPE_LABEL } from "@/lib/activity";
import { ACTIVITY_TYPES } from "@/server/db/schema";

// Opened by ?quick=activity or ?quick=followup on any page, so the palette
// and the phone nav can reach it from anywhere.
export function QuickAddSheet() {
  const pathname = usePathname();
  const params = useSearchParams();
  const kind = params.get("quick");
  const [companies, setCompanies] = useState<PickerCompany[] | null>(null);

  useEffect(() => {
    if (kind && companies === null) {
      listPickerCompanies().then(setCompanies);
    }
  }, [kind, companies]);

  if (kind !== "activity" && kind !== "followup") return null;
  if (companies === null) return null;

  const rest = new URLSearchParams(params);
  rest.delete("quick");
  const query = rest.toString();
  const closeHref = query ? `${pathname}?${query}` : pathname;

  if (kind === "activity") {
    return (
      <FormSheet
        key="activity"
        title="Log activity"
        description="Right after a call or meeting."
        closeHref={closeHref}
        action={logActivityAction}
        submitLabel="Log activity"
      >
        <Field label="Company" name="companyId">
          {(p) => <CompanyPicker companies={companies} {...p} />}
        </Field>
        <Field label="Type" name="type">
          {(p) => (
            <Select {...p} defaultValue="call">
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACTIVITY_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Subject" name="subject" hint="Optional for notes.">
          {(p) => <TextInput {...p} />}
        </Field>
        <Field
          label="When"
          name="occurredAt"
          hint="Defaults to now. The start time for a meeting."
        >
          {(p) => <TextInput {...p} type="datetime-local" />}
        </Field>
        <Field label="What happened" name="body">
          {(p) => (
            <Textarea
              {...p}
              rows={4}
              placeholder="Talked pricing, they want a proposal by Friday…"
            />
          )}
        </Field>
      </FormSheet>
    );
  }

  return (
    <FormSheet
      key="followup"
      title="Add follow-up"
      description="What needs to happen next, and by when."
      closeHref={closeHref}
      action={addFollowUpAction}
      submitLabel="Add follow-up"
    >
      <Field label="Company" name="companyId">
        {(p) => <CompanyPicker companies={companies} {...p} />}
      </Field>
      <Field label="What's next" name="title">
        {(p) => <TextInput {...p} placeholder="Send proposal" />}
      </Field>
      <Field label="Due" name="dueDate">
        {(p) => <DateField {...p} />}
      </Field>
    </FormSheet>
  );
}
