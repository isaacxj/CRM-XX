"use client";

import { ErrorState } from "@/components/kit/error-state";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      title="Something went wrong"
      description="That page failed to load, and nothing was lost. Try again, and if it keeps happening, reload the app."
      actions={<Button onClick={() => reset()}>Try again</Button>}
    />
  );
}
