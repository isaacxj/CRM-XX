import Link from "next/link";

import { ErrorState } from "@/components/kit/error-state";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <ErrorState
      title="We couldn't find that page"
      description="The link may be old, or the record may have been archived or deleted. Search for it, or head back to Today."
      actions={
        <>
          <Link href="/" className={buttonVariants({})}>
            Go to Today
          </Link>
          <Link
            href="/search"
            className={buttonVariants({ variant: "secondary" })}
          >
            Search
          </Link>
        </>
      }
    />
  );
}
