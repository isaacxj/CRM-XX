import Link from "next/link";

export type Who = "mine" | "everyone";

export function parseWho(value: unknown): Who {
  return value === "mine" ? "mine" : "everyone";
}

// Links back to the same page with `who` swapped; `hrefFor` builds each URL.
export function WhoFilter({
  who,
  hrefFor,
}: {
  who: Who;
  hrefFor: (who: Who) => string;
}) {
  return (
    <div className="flex gap-1" role="group" aria-label="Owner filter">
      {(["everyone", "mine"] as const).map((w) => (
        <Link
          key={w}
          href={hrefFor(w)}
          aria-current={w === who ? "true" : undefined}
          className={`rounded px-3 py-2 text-sm ${
            w === who
              ? "bg-zinc-100 font-medium dark:bg-zinc-800"
              : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
          }`}
        >
          {w === "mine" ? "Mine" : "Everyone"}
        </Link>
      ))}
    </div>
  );
}
