import Link from "next/link";

import { PageHeader } from "@/components/kit/page-header";
import { BusinessBadge, StatusBadge } from "@/components/kit/status-badges";
import { EmptyState } from "@/components/kit/data-table";
import { ToastOnMount } from "@/components/kit/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listDuplicateGroups } from "@/server/db/duplicates";
import { BUSINESSES } from "@/server/db/schema";
import type { CompanyStatus } from "@/server/db/schema";
import { mergeCompaniesAction } from "./actions";

function counts(c: {
  contacts: number;
  deals: number;
  activities: number;
  tasks: number;
}) {
  const parts = [
    [c.contacts, "contact"],
    [c.deals, "deal"],
    [c.activities, "activity", "activities"],
    [c.tasks, "follow-up"],
  ] as const;
  const shown = parts
    .filter(([n]) => n > 0)
    .map(([n, one, many]) => `${n} ${n === 1 ? one : (many ?? `${one}s`)}`);
  return shown.length ? shown.join(", ") : "Nothing logged yet";
}

export default async function DuplicatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const business = BUSINESSES.find((b) => b === params.business);
  const merged = typeof params.merged === "string" ? params.merged : null;
  const groups = await listDuplicateGroups(business);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      {merged && <ToastOnMount message={merged} />}
      <PageHeader
        title="Duplicate companies"
        description="Companies in the same business with the same name or website. Merging moves contacts, deals, activity and follow-ups onto the company you keep and archives the other."
        actions={
          <Link
            href="/companies"
            className={buttonVariants({ variant: "secondary" })}
          >
            Back to companies
          </Link>
        }
      />

      {groups.length === 0 ? (
        <EmptyState title="No duplicates found. After a CSV import, check back here to clean up companies that were entered twice." />
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <Card key={group[0].id} className="flex flex-col gap-3 p-4">
              <h2 className="text-base font-semibold">{group[0].name}</h2>
              <ul className="divide-border flex flex-col divide-y">
                {group.map((company) => (
                  <li
                    key={company.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/companies/${company.id}`}
                          className="font-medium hover:underline"
                        >
                          {company.name}
                        </Link>
                        <BusinessBadge business={company.business} />
                        <StatusBadge status={company.status as CompanyStatus} />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {[company.website, counts(company)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {group.length === 2 ? (
                      <form action={mergeCompaniesAction}>
                        <input type="hidden" name="keepId" value={company.id} />
                        <input
                          type="hidden"
                          name="mergeId"
                          value={
                            group.find((other) => other.id !== company.id)!.id
                          }
                        />
                        <Button type="submit" variant="secondary">
                          Keep this one
                        </Button>
                      </form>
                    ) : (
                      <form
                        action={mergeCompaniesAction}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="keepId" value={company.id} />
                        <label
                          htmlFor={`merge-${company.id}`}
                          className="sr-only"
                        >
                          Merge into {company.name}
                        </label>
                        <select
                          id={`merge-${company.id}`}
                          name="mergeId"
                          className="border-border-strong bg-surface-raised text-foreground h-9 rounded-md border px-3 text-sm"
                        >
                          {group
                            .filter((other) => other.id !== company.id)
                            .map((other) => (
                              <option key={other.id} value={other.id}>
                                Merge #{other.id} into this
                              </option>
                            ))}
                        </select>
                        <Button type="submit" variant="secondary">
                          Merge
                        </Button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
