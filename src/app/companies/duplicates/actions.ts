"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { firstProblem, recordId, withProblem } from "@/lib/action-input";
import { mergeCompanies } from "@/server/db/duplicates";

const mergeInput = z.object({ keepId: recordId, mergeId: recordId });
const PATH = "/companies/duplicates";

export async function mergeCompaniesAction(formData: FormData) {
  const parsed = mergeInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(withProblem(PATH, firstProblem(parsed.error)));

  const result = await mergeCompanies(parsed.data.keepId, parsed.data.mergeId);
  if (!result.ok) redirect(withProblem(PATH, result.problem));

  const url = new URLSearchParams({
    merged: `Merged ${result.mergedName} into ${result.keepName}.`,
  });
  redirect(`${PATH}?${url}`);
}
