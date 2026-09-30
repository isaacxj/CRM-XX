import Link from "next/link";

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Morning digest</h1>
          <p className="mt-1 max-w-prose text-zinc-600 dark:text-zinc-400">
            What each person gets by email on weekday mornings: overdue
            follow-ups, replies still pending, and today&apos;s meetings. People
            with nothing due are skipped. Times are UTC.
          </p>
        </div>
        {me && (
          <WhoFilter
            who={who}
            hrefFor={(w) => (w === "mine" ? "/digest?who=mine" : "/digest")}
          />
        )}
      </div>

      {digests.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nothing to send right now.{" "}
          <Link href="/tasks" className="underline">
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
              className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800"
            >
              <p className="text-sm text-zinc-500">To: {d.ownerEmail}</p>
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
