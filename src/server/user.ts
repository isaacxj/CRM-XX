import { env } from "cloudflare:workers";
import { headers } from "next/headers";

// Cloudflare Access puts the signed-in Google address in this header.
// Locally there is no Access, so DEV_USER_EMAIL stands in.
export async function getCurrentUserEmail(): Promise<string | null> {
  const fromHeader = (await headers()).get(
    "Cf-Access-Authenticated-User-Email",
  );
  const email =
    fromHeader ??
    (env as unknown as { DEV_USER_EMAIL?: string }).DEV_USER_EMAIL;
  return email?.trim().toLowerCase() || null;
}
