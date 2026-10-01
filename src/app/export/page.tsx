import { BUSINESSES, type Business } from "@/server/db/schema";

const BUSINESS_LABEL: Record<Business, string> = {
  statixx: "Statixx",
  trazo: "Trazo",
};

const DATASETS = [
  {
    key: "companies",
    label: "Companies and contacts",
    note: "One row per contact. Re-imports through the company importer.",
  },
  { key: "contacts", label: "Contacts", note: "With their company." },
  { key: "deals", label: "Deals", note: "Stage, amount, billing, close date." },
  {
    key: "activities",
    label: "Activities",
    note: "Emails, calls, meetings, and notes, newest first.",
  },
  {
    key: "tasks",
    label: "Tasks",
    note: "Follow-ups and waiting-on-reply reminders. Tasks with no company are only in All.",
  },
];

export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string }>;
}) {
  const { business: requested = "" } = await searchParams;
  const business = (BUSINESSES as readonly string[]).includes(requested)
    ? (requested as Business)
    : undefined;
  const query = business ? `?business=${business}` : "";

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-semibold">Export</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Download your data as CSV. Archived companies are left out.
      </p>

      <div className="mt-4 flex gap-2 text-sm">
        {[undefined, ...BUSINESSES].map((value) => (
          <a
            key={value ?? "all"}
            href={value ? `/export?business=${value}` : "/export"}
            className={`rounded-md border px-3 py-1.5 ${
              value === business
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 hover:bg-zinc-100"
            }`}
          >
            {value ? BUSINESS_LABEL[value] : "All"}
          </a>
        ))}
      </div>

      <ul className="mt-6 divide-y rounded-md border">
        {DATASETS.map((dataset) => (
          <li
            key={dataset.key}
            className="flex items-center justify-between gap-4 p-3"
          >
            <div>
              <div className="font-medium">{dataset.label}</div>
              <div className="text-sm text-zinc-600">{dataset.note}</div>
            </div>
            <a
              href={`/export/${dataset.key}${query}`}
              className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100"
            >
              Download CSV
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
