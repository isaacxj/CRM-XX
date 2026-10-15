import { PageHeader } from "@/components/kit/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  const pill = (active: boolean) =>
    `inline-flex min-h-9 items-center rounded-md px-3 text-sm transition-colors ${
      active
        ? "bg-surface-hover text-foreground font-medium"
        : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
    }`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Export"
        description="Download your data as CSV. Archived companies are left out."
      />

      <div className="flex gap-1" role="group" aria-label="Business filter">
        {[undefined, ...BUSINESSES].map((value) => (
          <a
            key={value ?? "all"}
            href={value ? `/export?business=${value}` : "/export"}
            aria-current={value === business ? "true" : undefined}
            className={pill(value === business)}
          >
            {value ? BUSINESS_LABEL[value] : "All"}
          </a>
        ))}
      </div>

      <Card className="divide-border divide-y p-0">
        {DATASETS.map((dataset) => (
          <div
            key={dataset.key}
            className="flex flex-wrap items-center justify-between gap-3 p-3"
          >
            <div className="min-w-0 flex-1 basis-56">
              <div className="font-medium">{dataset.label}</div>
              <div className="text-muted-foreground text-sm">
                {dataset.note}
              </div>
            </div>
            <a
              href={`/export/${dataset.key}${query}`}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Download CSV
            </a>
          </div>
        ))}
      </Card>
    </div>
  );
}
