import { EmailMessage } from "cloudflare:email";
import { drizzle } from "drizzle-orm/d1";

import {
  buildDigests,
  isEmptyDigest,
  renderDigest,
  type DigestDb,
} from "../../../src/server/db/digest";
import { logInboundEmail } from "../../../src/server/db/emailLog";
import * as schema from "../../../src/server/db/schema";

type AlertsEnv = {
  DB: D1Database;
  SEND_EMAIL: SendEmail;
  APP_URL: string;
  FROM_ADDRESS: string;
  // Comma-separated team addresses, on top of anyone who already owns a task.
  TEAM_EMAILS: string;
  // Gets Gmail's forwarding-verification email.
  ADMIN_EMAIL: string;
};

function base64Lines(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/.{1,76}/g, "$&\r\n");
}

function buildMime(opts: {
  from: string;
  to: string;
  subject: string;
  text: string;
}) {
  const domain = opts.from.split("@")[1] ?? "localhost";
  return [
    `From: CRM-XX <${opts.from}>`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(opts.text),
  ].join("\r\n");
}

export async function sendDigests(env: AlertsEnv, now = new Date()) {
  const db = drizzle(env.DB, { schema }) as DigestDb;
  const digests = (await buildDigests(db, now)).filter(
    (d) => !isEmptyDigest(d),
  );
  const results: { to: string; ok: boolean; error?: string }[] = [];

  for (const digest of digests) {
    const { subject, text } = renderDigest(digest, env.APP_URL);
    const raw = buildMime({
      from: env.FROM_ADDRESS,
      to: digest.ownerEmail,
      subject,
      text,
    });
    try {
      await env.SEND_EMAIL.send(
        new EmailMessage(env.FROM_ADDRESS, digest.ownerEmail, raw),
      );
      results.push({ to: digest.ownerEmail, ok: true });
    } catch (err) {
      // One bad address (say, unverified in Email Routing) shouldn't stop the rest.
      const error = err instanceof Error ? err.message : String(err);
      console.error(`Digest to ${digest.ownerEmail} failed: ${error}`);
      results.push({ to: digest.ownerEmail, ok: false, error });
    }
  }
  return results;
}

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(sendDigests(env));
  },
  // Mail sent to the logging address (BCCs, forwarded replies, invites).
  async email(message, env) {
    const raw = await new Response(message.raw).text();
    const db = drizzle(env.DB, { schema }) as DigestDb;
    const result = await logInboundEmail(db, raw, {
      teamEmails: (env.TEAM_EMAILS ?? "").split(","),
    });
    if (result.action === "verification") {
      if (env.ADMIN_EMAIL) await message.forward(env.ADMIN_EMAIL);
      else
        console.error("Forwarding verification arrived; ADMIN_EMAIL is unset.");
    } else if (result.action === "ignored") {
      console.log(`Ignored email from ${message.from}: ${result.reason}`);
    } else {
      console.log(`Logged ${result.action} #${result.activityId}`);
    }
  },
} satisfies ExportedHandler<AlertsEnv>;
