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
          className={`inline-flex min-h-8 items-center rounded-md px-3 text-sm max-md:min-h-(--tap-target) ${
            w === who
              ? "bg-muted text-foreground font-medium"
              : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          }`}
        >
          {w === "mine" ? "Mine" : "Everyone"}
        </Link>
      ))}
    </div>
  );
}
