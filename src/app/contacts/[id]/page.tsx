import { notFound } from "next/navigation";
import Link from "next/link";

import { Avatar } from "@/components/kit/avatar";
import { PageHeader } from "@/components/kit/page-header";
import { BusinessBadge } from "@/components/kit/status-badges";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ACTIVITY_TYPE_ICON,
  ACTIVITY_TYPE_LABEL,
  formatDaysAgo,
  formatMeetingTime,
  ownerLabel,
} from "@/lib/activity";
import { cn } from "@/lib/cn";
import { listActivitiesForContact } from "@/server/db/activities";
import { getContactWithCompany, listColleagues } from "@/server/db/contacts";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) notFound();

  const contact = await getContactWithCompany(id);
  if (!contact) notFound();

  const [timeline, colleagues] = await Promise.all([
    listActivitiesForContact(id),
    listColleagues(contact.companyId, id),
  ]);
  const lastContacted = timeline.find(
    (a) => a.type !== "meeting" || a.occurredAt <= new Date().toISOString(),
  );

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title={contact.name}
        description={
          [contact.title, contact.companyName].filter(Boolean).join(" at ") ||
          undefined
        }
        actions={
          <>
            {contact.email ? (
              <a
                href={`mailto:${contact.email}`}
                className={cn(buttonVariants({ variant: "secondary" }))}
              >
                Email
              </a>
            ) : null}
            {contact.phone ? (
              <a
                href={`tel:${contact.phone}`}
                className={cn(buttonVariants({ variant: "secondary" }))}
              >
                Call
              </a>
            ) : null}
            <Link
              href={`/companies/${contact.companyId}`}
              className={cn(buttonVariants({ variant: "primary" }))}
            >
              Open company
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-3">
              <Avatar name={contact.name} />
              <div className="min-w-0">
                <div className="truncate font-medium">{contact.name}</div>
                <div className="text-muted-foreground truncate text-sm">
                  {contact.title ?? "No title"}
                </div>
              </div>
            </div>
            <dl className="grid grid-cols-[88px_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Company</dt>
              <dd>
                <Link
                  href={`/companies/${contact.companyId}`}
                  className="hover:underline"
                >
                  {contact.companyName}
                </Link>
              </dd>
              <dt className="text-muted-foreground">Business</dt>
              <dd>
                <BusinessBadge business={contact.business} />
              </dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="break-all">{contact.email ?? "—"}</dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="num">{contact.phone ?? "—"}</dd>
              <dt className="text-muted-foreground">Last contact</dt>
              <dd>
                {lastContacted ? formatDaysAgo(lastContacted.occurredAt) : "—"}
              </dd>
            </dl>
          </Card>

          {colleagues.length > 0 ? (
            <Card className="flex flex-col gap-2 p-4">
              <h2 className="text-sm font-medium">
                Others at {contact.companyName}
              </h2>
              <ul className="flex flex-col gap-1 text-sm">
                {colleagues.map((colleague) => (
                  <li key={colleague.id}>
                    <Link
                      href={`/contacts/${colleague.id}`}
                      className="hover:underline"
                    >
                      {colleague.name}
                    </Link>
                    {colleague.title ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {colleague.title}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <section aria-labelledby="timeline" className="flex flex-col gap-3">
          <h2 id="timeline" className="text-lg font-medium">
            Activity with {contact.name}
          </h2>
          {timeline.length === 0 ? (
            <Card className="text-muted-foreground p-6 text-sm">
              Nothing logged with {contact.name} yet. Open the company and log
              an email, call or meeting, and pick them as the contact.
            </Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {timeline.map((activity) => (
                <li key={activity.id}>
                  <Card className="flex flex-col gap-1 p-4">
                    <div className="flex flex-wrap items-baseline gap-2 text-sm">
                      <span aria-hidden>
                        {ACTIVITY_TYPE_ICON[activity.type]}
                      </span>
                      <span className="font-medium">
                        {activity.subject || ACTIVITY_TYPE_LABEL[activity.type]}
                      </span>
                      <span className="text-muted-foreground num ml-auto text-xs">
                        {activity.type === "meeting"
                          ? formatMeetingTime(
                              activity.occurredAt,
                              activity.endsAt,
                            )
                          : formatDaysAgo(activity.occurredAt)}
                        {activity.ownerEmail
                          ? ` · ${ownerLabel(activity.ownerEmail)}`
                          : ""}
                      </span>
                    </div>
                    {activity.body ? (
                      <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                        {activity.body}
                      </p>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
