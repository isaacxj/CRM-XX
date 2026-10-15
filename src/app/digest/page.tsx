import Link from "next/link";

import { PageHeader } from "@/components/kit/page-header";
import { WhoFilter, parseWho } from "@/components/who-filter";
import { previewDigests, renderDigest } from "@/server/db/digest";
import { getCurrentUserEmail } from "@/server/user";

export default async function DigestPreview({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const me = await getCurrentUserEmail();
  const who = me ? parseWho(params.who) : "everyone";
  const digests = await previewDigests(who === "mine" && me ? me : undefined);
  const appUrl = "";

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <PageHeader
        title="Morning digest"
        description="What each person gets by email on weekday mornings: overdue follow-ups, replies still pending, and today's meetings. People with nothing due are skipped. Times are UTC."
        actions={
          me ? (
            <WhoFilter
              who={who}
              hrefFor={(w) => (w === "mine" ? "/digest?who=mine" : "/digest")}
            />
          ) : undefined
        }
      />

      {digests.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing to send right now.{" "}
          <Link href="/tasks" className="text-accent underline">
            Add a follow-up
          </Link>{" "}
          or log a meeting for today and it will show up here.
        </p>
      ) : (
        digests.map((d) => {
          const { subject, text } = renderDigest(d, appUrl);
          return (
            <section
              key={d.ownerEmail}
              className="border-border bg-surface-raised rounded-lg border p-6"
            >
              <p className="text-muted-foreground text-sm">
                To: {d.ownerEmail}
              </p>
              <h2 className="mt-1 text-lg font-semibold">{subject}</h2>
              <pre className="mt-3 overflow-x-auto font-sans text-sm whitespace-pre-wrap">
                {text}
              </pre>
            </section>
          );
        })
      )}
    </div>
  );
}
