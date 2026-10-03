"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { X } from "lucide-react";

// Side panel frame. The content is server-rendered; this adds Escape to close
// and a backdrop click on phones.
export function DealPanel({
  closeHref,
  title,
  children,
}: {
  closeHref: string;
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") router.push(closeHref);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, closeHref]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close deal panel"
        tabIndex={-1}
        onClick={() => router.push(closeHref)}
        className="absolute inset-0 bg-black/30"
      />
      <aside
        aria-label={`Deal: ${title}`}
        className="bg-surface-raised border-border-strong shadow-overlay relative flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto border-l p-5 pb-24 md:pb-5"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => router.push(closeHref)}
          className="text-muted-foreground hover:text-foreground absolute top-3 right-3 rounded-md p-1.5"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        {children}
      </aside>
    </div>
  );
}
