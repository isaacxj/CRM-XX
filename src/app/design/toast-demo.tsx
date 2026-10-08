"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/kit/toast";

export function ToastDemo() {
  const toast = useToast();
  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={() => toast("Company added.")}>
        Show success toast
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast("Couldn't save. Check the name and try again.", "danger")
        }
      >
        Show error toast
      </Button>
    </div>
  );
}
