import Link from "next/link";
import { Check, Circle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { StartProgress } from "@/server/db/onboarding";

const NAME = { statixx: "Statixx", trazo: "Trazo" } as const;

export function GettingStarted({ progress }: { progress: StartProgress }) {
  const { business } = progress;
  const hasCompanies = progress.companies > 0;
  const steps = [
    {
      title: "Import your spreadsheet",
      body: "Upload a CSV of companies and contacts and match its columns.",
      href: `/companies/import`,
      action: "Import a CSV",
      done: hasCompanies,
    },
    {
      title: "Add a company",
      body: "Or add a first prospect or client by hand.",
      href: `/companies?new=1&business=${business}`,
      action: "Add company",
      done: hasCompanies,
    },
    {
      title: "Log the first activity",
      body: "Record an email, call, or meeting so follow-ups start tracking.",
      href: "/?quick=activity",
      action: "Log activity",
      done: progress.activities > 0,
    },
  ];

  return (
    <section aria-labelledby={`start-${business}`}>
      <Card className="flex flex-col gap-4">
        <div>
          <h2 id={`start-${business}`} className="text-sm font-semibold">
            Get {NAME[business]} started
          </h2>
          <p className="text-muted-foreground text-xs">
            {NAME[business]} has no data yet. Three steps and Today fills in.
          </p>
        </div>
        <ol className="flex flex-col gap-3">
          {steps.map((step) => (
            <li key={step.title} className="flex items-start gap-3">
              {step.done ? (
                <Check
                  className="text-success mt-0.5 size-4 shrink-0"
                  aria-label="Done"
                />
              ) : (
                <Circle
                  className="text-muted-foreground mt-0.5 size-4 shrink-0"
                  aria-label="Not done"
                />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.done && "text-muted-foreground line-through",
                  )}
                >
                  {step.title}
                </p>
                <p className="text-muted-foreground text-xs">{step.body}</p>
              </div>
              {!step.done && (
                <Link
                  href={step.href}
                  className={buttonVariants({
                    variant: "secondary",
                    size: "sm",
                  })}
                >
                  {step.action}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}
