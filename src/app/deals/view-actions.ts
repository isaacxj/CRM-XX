"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { firstProblem, recordId, withProblem } from "@/lib/action-input";
import { createSavedView, deleteSavedView } from "@/server/db/savedViews";

// Only same-site deals addresses are accepted as a place to return to.
function dealsPath(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  return path === "/deals" || path.startsWith("/deals?") ? path : "/deals";
}

// A view keeps what you are looking at, not a page number, open deal or flash.
const VIEW_KEYS = ["business", "view", "q", "billing", "status"] as const;
const FILTER_KEYS = ["q", "billing", "status"] as const;

const savedViewInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name the view before saving it.")
    .max(40, "Keep the view name under 40 characters."),
});

export async function saveDealViewAction(formData: FormData) {
  const here = dealsPath(formData.get("returnTo"));
  const parsed = savedViewInput.safeParse({ name: formData.get("name") });
  if (!parsed.success) redirect(withProblem(here, firstProblem(parsed.error)));

  const current = new URL(here, "http://local").searchParams;
  if (!FILTER_KEYS.some((key) => current.get(key)))
    redirect(withProblem(here, "Choose a filter before saving a view."));
  const query = new URLSearchParams();
  for (const key of VIEW_KEYS) {
    const value = current.get(key);
    if (value) query.set(key, value);
  }

  await createSavedView({
    scope: "deals",
    name: parsed.data.name,
    query: query.toString(),
  });
  const next = new URLSearchParams(query);
  next.set("viewMsg", `Saved view ${parsed.data.name}.`);
  redirect(`/deals?${next}`);
}

export async function deleteDealViewAction(formData: FormData) {
  const here = dealsPath(formData.get("returnTo"));
  const id = recordId.safeParse(formData.get("id"));
  if (!id.success) redirect(withProblem(here, firstProblem(id.error)));
  await deleteSavedView(id.data);
  const url = new URL(here, "http://local");
  url.searchParams.set("viewMsg", "Removed the saved view.");
  redirect(`${url.pathname}${url.search}`);
}
