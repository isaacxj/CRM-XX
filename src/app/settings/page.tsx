import { env } from "cloudflare:workers";
import Link from "next/link";

import { PageHeader } from "@/components/kit/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";
import { SHORTCUTS } from "@/lib/shortcuts";
import { getCurrentUserEmail } from "@/server/user";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 text-sm font-semibold">
        {title}
      </h2>
      <Card className="flex flex-col gap-3 text-sm">{children}</Card>
    </section>
  );
}

export default async function Settings() {
  const me = await getCurrentUserEmail();
  const logAddress = (
    env as unknown as { LOG_ADDRESS?: string }
  ).LOG_ADDRESS?.trim();

  return (
    <div className="flex max-w-3xl flex-1 flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="Settings"
        description={me ? `Signed in as ${me}` : undefined}
      />

      <Section id="theme" title="Theme">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground">
            Light, dark, or match your device. Saved on this browser.
          </p>
          <ThemeToggle />
        </div>
      </Section>

      <Section id="logging" title="Email logging address">
        {logAddress ? (
          <p>
            <span className="num bg-muted rounded px-1.5 py-0.5 select-all">
              {logAddress}
            </span>
          </p>
        ) : (
          <p className="text-muted-foreground">
            No logging address is set yet. Set <code>LOG_ADDRESS</code> to the
            address Email Routing sends to the alerts Worker and it shows here.
          </p>
        )}
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
          <li>
            BCC it on an email to a contact. The CRM logs an email sent on their
            company and starts a 3-day waiting-on-reply reminder.
          </li>
          <li>
            Forward a reply to it. It is logged as an email received and closes
            the reminder.
          </li>
          <li>
            Forward a calendar invite to it and it becomes a meeting on the
            contact&apos;s company.
          </li>
          <li>Mail from outside the team with no known thread is ignored.</li>
        </ul>
      </Section>

      <Section id="digest" title="Morning digest">
        <p className="text-muted-foreground">
          Each person gets an email on weekday mornings with overdue follow-ups,
          replies still pending, and today&apos;s meetings.
        </p>
        <Link href="/digest" className="text-accent w-fit underline">
          Preview the digest
        </Link>
      </Section>

      <Section id="shortcuts" title="Keyboard shortcuts">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="contents">
              <dt>
                <kbd className="num border-border bg-muted rounded border px-1.5 py-0.5 text-xs">
                  {s.keys}
                </kbd>
              </dt>
              <dd className="text-muted-foreground">{s.label}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}
