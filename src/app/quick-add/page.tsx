import Link from "next/link";
import { redirect } from "next/navigation";

import { listCompanies } from "@/server/db/companies";
import { createActivity } from "@/server/db/activities";
import { ACTIVITY_TYPE_LABEL } from "@/lib/activity";
import { ACTIVITY_TYPES, type ActivityType } from "@/server/db/schema";
import { createTask } from "@/server/db/tasks";
import { BUSINESSES, type Business } from "@/server/db/schema";

const BUSINESS_LABEL: Record<Business, string> = {
  statixx: "Statixx",
  trazo: "Trazo",
};

function CompanySelect({
  companies,
  id,
}: {
  companies: { id: number; name: string; business: Business }[];
  id: string;
}) {
  return (
    <select
      id={id}
      name="companyId"
      required
      defaultValue=""
      className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <option value="" disabled>
        Choose a company…
      </option>
      {BUSINESSES.map((business) => {
        const inBusiness = companies.filter((c) => c.business === business);
        if (inBusiness.length === 0) return null;
        return (
          <optgroup key={business} label={BUSINESS_LABEL[business]}>
            {inBusiness.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}

export default async function QuickAddPage() {
  const companies = await listCompanies({});

  async function addNote(formData: FormData) {
    "use server";
    const companyId = Number(formData.get("companyId"));
    const body = formData.get("body");
    if (!Number.isInteger(companyId) || typeof body !== "string") {
      throw new Error("Pick a company and write what happened.");
    }
    const type = formData.get("type");
    await createActivity({
      companyId,
      type: ACTIVITY_TYPES.includes(type as ActivityType)
        ? (type as ActivityType)
        : "note",
      subject: (formData.get("subject") as string | null) ?? null,
      body: body.trim(),
      occurredAt: (formData.get("occurredAt") as string | null) || null,
      endsAt: (formData.get("endsAt") as string | null) || null,
    });
    redirect(`/companies/${companyId}`);
  }

  async function addFollowUp(formData: FormData) {
    "use server";
    const companyId = Number(formData.get("companyId"));
    const title = formData.get("title");
    const dueDate = formData.get("dueDate");
    if (
      !Number.isInteger(companyId) ||
      typeof title !== "string" ||
      title.trim().length === 0
    ) {
      throw new Error("Pick a company and describe the follow-up.");
    }
    await createTask(companyId, {
      title: title.trim(),
      dueDate:
        typeof dueDate === "string" && dueDate.trim() ? dueDate.trim() : null,
    });
    redirect(`/companies/${companyId}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 pb-24 md:p-8 md:pb-8">
      <div>
        <h1 className="text-2xl font-semibold">Quick add</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Log a note, email, call, meeting, or follow-up right after a call,
          without hunting for the company page first.
        </p>
      </div>

      {companies.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No companies yet.{" "}
          <Link href="/companies/new" className="underline">
            Add a company
          </Link>{" "}
          before you can log an activity or follow-up.
        </p>
      ) : (
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-6">
          <form
            action={addNote}
            className="flex flex-1 flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <h2 className="text-lg font-semibold">Log an activity</h2>
            <div className="flex flex-col gap-1">
              <label htmlFor="note-company" className="text-sm font-medium">
                Company
              </label>
              <CompanySelect companies={companies} id="note-company" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="note-type" className="text-sm font-medium">
                Type
              </label>
              <select
                id="note-type"
                name="type"
                className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ACTIVITY_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="note-subject" className="text-sm font-medium">
                Subject (optional)
              </label>
              <input
                id="note-subject"
                name="subject"
                className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="note-when" className="text-sm font-medium">
                When (defaults to now; the start time for a meeting)
              </label>
              <input
                id="note-when"
                name="occurredAt"
                type="datetime-local"
                className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="note-ends" className="text-sm font-medium">
                Meeting ends (optional)
              </label>
              <input
                id="note-ends"
                name="endsAt"
                type="datetime-local"
                className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="note-body" className="text-sm font-medium">
                What happened
              </label>
              <textarea
                id="note-body"
                name="body"
                rows={4}
                placeholder="Talked pricing, they want a proposal by Friday…"
                className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <button
              type="submit"
              className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Log activity
            </button>
          </form>

          <form
            action={addFollowUp}
            className="flex flex-1 flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <h2 className="text-lg font-semibold">Log a follow-up</h2>
            <div className="flex flex-col gap-1">
              <label htmlFor="task-company" className="text-sm font-medium">
                Company
              </label>
              <CompanySelect companies={companies} id="task-company" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="task-title" className="text-sm font-medium">
                What&apos;s next
              </label>
              <input
                id="task-title"
                name="title"
                type="text"
                required
                placeholder="Send proposal"
                className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="task-due" className="text-sm font-medium">
                Due
              </label>
              <input
                id="task-due"
                name="dueDate"
                type="date"
                className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <button
              type="submit"
              className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Add follow-up
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
