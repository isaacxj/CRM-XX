import Link from "next/link";

import { EmptyState } from "@/components/kit/data-table";
import { PageHeader } from "@/components/kit/page-header";
import { BusinessBadge } from "@/components/kit/status-badges";
import { ToastOnMount } from "@/components/kit/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listDuplicateContactGroups } from "@/server/db/duplicateContacts";
import { BUSINESSES } from "@/server/db/schema";
import { mergeContactsAction } from "./actions";

export default async function DuplicateContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const business = BUSINESSES.find((b) => b === params.business);
  const merged = typeof params.merged === "string" ? params.merged : null;
  const groups = await listDuplicateContactGroups(business);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      {merged && <ToastOnMount message={merged} />}
      <PageHeader
        title="Duplicate contacts"
        description="People at the same company with the same email or name. Merging moves logged activity onto the contact you keep, fills its blank email, phone and title, and removes the other."
        actions={
          <Link
            href="/contacts"
            className={buttonVariants({ variant: "secondary" })}
          >
            Back to contacts
          </Link>
        }
      />

      {groups.length === 0 ? (
        <EmptyState title="No duplicate contacts found. After a CSV import, check back here to clean up people who were entered twice." />
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <Card key={group[0].id} className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold">{group[0].name}</h2>
                <BusinessBadge business={group[0].business} />
                <Link
                  href={`/companies/${group[0].companyId}`}
                  className="text-muted-foreground text-sm hover:underline"
                >
                  {group[0].companyName}
                </Link>
              </div>
              <ul className="divide-border flex flex-col divide-y">
                {group.map((contact) => (
                  <li
                    key={contact.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="font-medium">{contact.name}</span>
                      <p className="text-muted-foreground text-sm">
                        {[
                          contact.title,
                          contact.email,
                          contact.phone,
                          `${contact.activities} ${contact.activities === 1 ? "activity" : "activities"}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <form
                      action={mergeContactsAction}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="keepId" value={contact.id} />
                      {group.length === 2 ? (
                        <input
                          type="hidden"
                          name="mergeId"
                          value={group.find((o) => o.id !== contact.id)!.id}
                        />
                      ) : (
                        <>
                          <label
                            htmlFor={`merge-${contact.id}`}
                            className="sr-only"
                          >
                            Merge into {contact.name}
                          </label>
                          <select
                            id={`merge-${contact.id}`}
                            name="mergeId"
                            className="border-border-strong bg-surface-raised text-foreground h-9 rounded-md border px-3 text-sm"
                          >
                            {group
                              .filter((o) => o.id !== contact.id)
                              .map((o) => (
                                <option key={o.id} value={o.id}>
                                  Merge {o.email ?? o.name} (#{o.id}) into this
                                </option>
                              ))}
                          </select>
                        </>
                      )}
                      <Button type="submit" variant="secondary">
                        {group.length === 2 ? "Keep this one" : "Merge"}
                      </Button>
                    </form>
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
