import Link from "next/link";

import { PageHeader } from "@/components/kit/page-header";
import { Card } from "@/components/ui/card";
import { HELP_ENTRIES, RELEASE_NOTES } from "@/lib/help";
import { SHORTCUTS } from "@/lib/shortcuts";

export default function Help() {
  return (
    <div className="flex max-w-3xl flex-1 flex-col gap-8 p-4 md:p-8">
      <PageHeader
        title="Help"
        description="What each part of CRM-XX does, and what changed in this release."
      />

      <nav aria-label="On this page" className="flex flex-wrap gap-2 text-sm">
        {HELP_ENTRIES.map((e) => (
          <a
            key={e.id}
            href={`#${e.id}`}
            className="border-border hover:bg-muted rounded-md border px-2.5 py-1.5"
          >
            {e.title}
          </a>
        ))}
        <a
          href="#whats-new"
          className="border-border hover:bg-muted rounded-md border px-2.5 py-1.5"
        >
          What&apos;s new
        </a>
        <a
          href="#shortcuts"
          className="border-border hover:bg-muted rounded-md border px-2.5 py-1.5"
        >
          Shortcuts
        </a>
      </nav>

      <div className="flex flex-col gap-4">
        {HELP_ENTRIES.map((e) => (
          <section key={e.id} id={e.id} aria-labelledby={`${e.id}-h`}>
            <Card className="flex flex-col gap-2 text-sm">
              <h2 id={`${e.id}-h`} className="text-base font-semibold">
                {e.title}
              </h2>
              <p className="text-muted-foreground">{e.body}</p>
              {e.tips && (
                <ul className="text-muted-foreground list-disc space-y-1 pl-5">
                  {e.tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
              {e.href && (
                <Link
                  href={e.href}
                  className="text-accent w-fit underline"
                >
                  Open {e.title.toLowerCase()}
                </Link>
              )}
            </Card>
          </section>
        ))}
      </div>

      <section id="whats-new" aria-labelledby="whats-new-h">
        <h2 id="whats-new-h" className="mb-3 text-lg font-semibold">
          What&apos;s new
        </h2>
        <div className="flex flex-col gap-4">
          {RELEASE_NOTES.map((n) => (
            <Card key={n.stage} className="flex flex-col gap-2 text-sm">
              <h3 className="font-semibold">
                {n.stage}: {n.title}
              </h3>
              <ul className="text-muted-foreground list-disc space-y-1 pl-5">
                {n.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section id="shortcuts" aria-labelledby="shortcuts-h">
        <h2 id="shortcuts-h" className="mb-3 text-lg font-semibold">
          Keyboard shortcuts
        </h2>
        <Card className="text-sm">
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
        </Card>
      </section>
    </div>
  );
}
