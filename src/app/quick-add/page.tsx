import { redirect } from "next/navigation";

// Quick add is a sheet now; keep the old address working.
export default function QuickAddPage() {
  redirect("/?quick=activity");
}
