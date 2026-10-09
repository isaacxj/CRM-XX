import { cn } from "@/lib/cn";

/** Change versus the previous period, as a small colored chip. */
export function Delta({
  current,
  previous,
  suffix = "%",
  points = false,
}: {
  current: number | null;
  previous: number | null;
  suffix?: string;
  points?: boolean;
}) {
  if (current === null || previous === null) {
    return <span className="text-muted-foreground">No prior period</span>;
  }
  const diff = current - previous;
  if (diff === 0) {
    return <span className="text-muted-foreground">Same as last period</span>;
  }
  const text = points
    ? `${Math.abs(diff)} pts`
    : previous === 0
      ? "New"
      : `${Math.abs(Math.round((diff / previous) * 100))}${suffix}`;
  return (
    <span className={cn(diff > 0 ? "text-success" : "text-danger")}>
      <span aria-hidden>{diff > 0 ? "▲" : "▼"}</span>{" "}
      <span className="sr-only">{diff > 0 ? "Up" : "Down"} </span>
      {text} <span className="text-muted-foreground">vs last period</span>
    </span>
  );
}

export type BarRow = {
  label: string;
  value: number;
  display: string;
  note: string;
};

/** Horizontal bars, one row per stage, scaled to the largest value. */
export function HBars({
  rows,
  label = "Open pipeline by stage",
}: {
  rows: BarRow[];
  label?: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="flex flex-col gap-2" aria-label={label}>
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span>{row.label}</span>
            <span className="num">
              {row.display}{" "}
              <span className="text-muted-foreground">{row.note}</span>
            </span>
          </div>
          <svg
            className="mt-1 block w-full"
            height="8"
            viewBox={`0 0 100 8`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <rect width="100" height="8" rx="2" className="fill-muted" />
            <rect
              width={(row.value / max) * 100}
              height="8"
              rx="2"
              className="fill-accent"
            />
          </svg>
        </li>
      ))}
    </ul>
  );
}

export type Point = { label: string; value: number; display: string };

/** Simple line with end dots and first/last labels. Scales to its container. */
export function LineChart({
  points,
  title,
}: {
  points: Point[];
  title: string;
}) {
  const width = 600;
  const height = 180;
  const padX = 8;
  const padTop = 12;
  const padBottom = 8;
  const max = Math.max(1, ...points.map((p) => p.value));
  const x = (i: number) =>
    padX + (i / Math.max(1, points.length - 1)) * (width - padX * 2);
  const y = (v: number) =>
    padTop + (1 - v / max) * (height - padTop - padBottom);
  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`,
    )
    .join(" ");
  const area = `${path} L${x(points.length - 1)} ${height - padBottom} L${x(0)} ${height - padBottom} Z`;
  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-44 w-full"
        role="img"
        aria-label={title}
      >
        <line
          x1={padX}
          x2={width - padX}
          y1={height - padBottom}
          y2={height - padBottom}
          className="stroke-border"
        />
        <path d={area} className="fill-accent-soft" />
        <path
          d={path}
          fill="none"
          className="stroke-accent"
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          <circle
            key={p.label}
            cx={x(i)}
            cy={y(p.value)}
            r={i === points.length - 1 ? 4 : 2.5}
            className="fill-accent"
          >
            <title>{`${p.label}: ${p.display}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="text-muted-foreground num mt-1 flex justify-between text-xs">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </figcaption>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.label}>
              <th scope="row">{p.label}</th>
              <td>{p.display}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
