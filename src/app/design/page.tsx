import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Design · CRM-XX" };

const SURFACES = ["background", "surface", "surface-raised", "surface-hover"];
const TEXT = [
  { name: "foreground", cls: "text-foreground" },
  { name: "muted-foreground", cls: "text-muted-foreground" },
  { name: "accent", cls: "text-accent" },
  { name: "success", cls: "text-success" },
  { name: "warning", cls: "text-warning" },
  { name: "danger", cls: "text-danger" },
  { name: "info", cls: "text-info" },
];
const SIZES = [
  { cls: "text-xs", px: 12 },
  { cls: "text-sm", px: 13 },
  { cls: "text-base", px: 14 },
  { cls: "text-lg", px: 16 },
  { cls: "text-xl", px: 20 },
  { cls: "text-2xl", px: 24 },
  { cls: "text-3xl", px: 32 },
];

function Sample({
  theme,
  business,
}: {
  theme: "light" | "dark";
  business: string;
}) {
  return (
    <div
      className={`${theme} border-border bg-background text-foreground rounded-xl border p-5`}
      data-business={business}
    >
      <p className="text-muted-foreground mb-4 text-xs font-medium">
        {theme === "light" ? "Light" : "Dark"} · {business}
      </p>

      <h3 className="mb-2 text-sm font-medium">Surfaces</h3>
      <div className="mb-5 grid grid-cols-2 gap-2">
        {SURFACES.map((name) => (
          <div
            key={name}
            className="border-border rounded-lg border p-3 text-xs"
            style={{ background: `var(--${name})` }}
          >
            {name}
          </div>
        ))}
      </div>

      <h3 className="mb-2 text-sm font-medium">Text colors</h3>
      <ul className="mb-5 grid grid-cols-2 gap-x-2 gap-y-1">
        {TEXT.map(({ name, cls }) => (
          <li key={name} className={`${cls} text-sm`}>
            {name}
          </li>
        ))}
      </ul>

      <h3 className="mb-2 text-sm font-medium">Buttons</h3>
      <div className="mb-5 flex flex-wrap gap-2">
        <Button>Add company</Button>
        <Button variant="secondary">Edit</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="danger">Remove</Button>
        <Button disabled>Saving</Button>
      </div>

      <h3 className="mb-2 text-sm font-medium">Badges</h3>
      <div className="mb-5 flex flex-wrap gap-2">
        <Badge>Prospect</Badge>
        <Badge tone="accent">Client</Badge>
        <Badge tone="success">Won</Badge>
        <Badge tone="warning">Due today</Badge>
        <Badge tone="danger">Overdue</Badge>
        <Badge tone="info">Meeting</Badge>
      </div>

      <h3 className="mb-2 text-sm font-medium">Input and card</h3>
      <Card className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Company name
          <Input placeholder="Acme Corp" />
        </label>
        <p className="text-muted-foreground text-sm">
          Last activity <span className="num text-foreground">2026-09-30</span>{" "}
          · Pipeline <span className="num text-foreground">$45,000.00</span>
        </p>
        <div className="bg-surface-raised shadow-overlay rounded-xl p-3">
          <p className="text-muted-foreground text-xs">Overlay shadow</p>
        </div>
      </Card>
    </div>
  );
}

export default function DesignPage() {
  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
      <h1 className="text-2xl font-semibold">Design tokens</h1>
      <p className="text-muted-foreground mt-1 mb-6 text-sm">
        Every color, type size, radius, and base component, in both themes and
        both business accents. Use the theme toggle in the sidebar to preview
        the whole app.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Sample theme="light" business="statixx" />
        <Sample theme="dark" business="statixx" />
        <Sample theme="light" business="trazo" />
        <Sample theme="dark" business="trazo" />
      </div>

      <h2 className="mt-8 mb-3 text-lg font-medium">Type</h2>
      <div className="flex flex-col gap-1">
        {SIZES.map(({ cls, px }) => (
          <p key={cls} className={cls}>
            {px}px · Geist Sans · The quick brown fox
          </p>
        ))}
        <p className="num text-base">Geist Mono · 0123456789 · $12,400.00</p>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-medium">Radius and motion</h2>
      <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
        {[
          ["rounded-md", "6px inputs"],
          ["rounded-lg", "8px cards"],
          ["rounded-xl", "12px sheets"],
        ].map(([cls, label]) => (
          <div
            key={cls}
            className={`${cls} border-border-strong flex h-16 w-28 items-center justify-center border`}
          >
            {label}
          </div>
        ))}
        <p>Hover and open: 150–200ms ease-out, none with reduced motion.</p>
      </div>
    </div>
  );
}
