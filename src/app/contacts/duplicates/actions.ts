"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { firstProblem, recordId, withProblem } from "@/lib/action-input";
import { mergeContacts } from "@/server/db/duplicateContacts";

const mergeInput = z.object({ keepId: recordId, mergeId: recordId });
const PATH = "/contacts/duplicates";

export async function mergeContactsAction(formData: FormData) {
  const parsed = mergeInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(withProblem(PATH, firstProblem(parsed.error)));

  const result = await mergeContacts(parsed.data.keepId, parsed.data.mergeId);
  if (!result.ok) redirect(withProblem(PATH, result.problem));

  redirect(
    `${PATH}?${new URLSearchParams({ merged: `Merged into ${result.keepName}.` })}`,
  );
}
