import { getPlatformProxy } from "wrangler";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "../src/server/db/schema";

const STATIXX_COMPANIES = [
  {
    name: "Ridgeline Manufacturing",
    status: "client" as const,
    source: "referral",
  },
  {
    name: "Harbor Point Logistics",
    status: "client" as const,
    source: "referral",
  },
  {
    name: "Cobalt Analytics",
    status: "prospect" as const,
    source: "cold outreach",
  },
  {
    name: "Fernwood Retail Group",
    status: "prospect" as const,
    source: "conference",
  },
  {
    name: "Summit Legal Partners",
    status: "past" as const,
    source: "referral",
  },
  {
    name: "Northgate Credit Union",
    status: "client" as const,
    source: "website",
  },
];

const TRAZO_COMPANIES = [
  { name: "Pinewood Studios", status: "client" as const, source: "website" },
  {
    name: "Alto Health Clinics",
    status: "client" as const,
    source: "referral",
  },
  {
    name: "Brightline Coworking",
    status: "prospect" as const,
    source: "trial signup",
  },
  {
    name: "Verve Fitness",
    status: "prospect" as const,
    source: "trial signup",
  },
  {
    name: "Kestrel Robotics",
    status: "past" as const,
    source: "cold outreach",
  },
  {
    name: "Marlow & Co. Accounting",
    status: "client" as const,
    source: "referral",
  },
];

const STATIXX_DEAL_STAGES = [
  "qualified",
  "discovery",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
] as const;

const TRAZO_DEAL_STAGES = [
  "qualified",
  "discovery",
  "demo",
  "pilot",
  "proposal",
  "won",
] as const;

async function main() {
  const proxy = await getPlatformProxy<{ DB: D1Database }>();
  const db = drizzle(proxy.env.DB, { schema });

  await db.delete(schema.tasks);
  await db.delete(schema.notes);
  await db.delete(schema.deals);
  await db.delete(schema.contacts);
  await db.delete(schema.companies);

  for (const [business, list] of [
    ["statixx", STATIXX_COMPANIES],
    ["trazo", TRAZO_COMPANIES],
  ] as const) {
    const stages =
      business === "statixx" ? STATIXX_DEAL_STAGES : TRAZO_DEAL_STAGES;

    for (const [index, company] of list.entries()) {
      const [inserted] = await db
        .insert(schema.companies)
        .values({
          business,
          name: company.name,
          website: `https://${company.name.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
          status: company.status,
          source: company.source,
        })
        .returning();

      await db.insert(schema.contacts).values([
        {
          companyId: inserted.id,
          name: `${business === "statixx" ? "Sam" : "Robin"} ${company.name.split(" ")[0]}`,
          email: `contact@${company.name.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
          title: "Primary contact",
        },
      ]);

      const stage = stages[index % stages.length];
      await db.insert(schema.deals).values({
        companyId: inserted.id,
        title: `${company.name} ${business === "statixx" ? "engagement" : "subscription"}`,
        stage,
        amountCents:
          business === "statixx"
            ? 25_000_00 + index * 5_000_00
            : 500_00 + index * 100_00,
        billing: business === "statixx" ? "one_time" : "monthly",
        closeDate: stage === "won" || stage === "lost" ? "2026-08-15" : null,
        lostReason: stage === "lost" ? "Budget cut" : null,
      });

      await db.insert(schema.notes).values([
        {
          companyId: inserted.id,
          body: `Initial ${business === "statixx" ? "discovery call" : "demo"} went well.`,
        },
        {
          companyId: inserted.id,
          body:
            company.status === "client"
              ? "Checked in — happy with progress so far."
              : "Sent follow-up materials after the call.",
        },
      ]);

      if (index % 2 === 0) {
        await db.insert(schema.tasks).values({
          companyId: inserted.id,
          title: `Follow up with ${company.name}`,
          dueDate:
            index % 6 === 0
              ? "2026-09-18" // overdue
              : index % 4 === 0
                ? "2026-09-25" // due today
                : "2026-09-30", // upcoming
        });
      } else {
        await db.insert(schema.tasks).values({
          companyId: inserted.id,
          title: `Sent proposal to ${company.name}`,
          dueDate: "2026-09-10",
          doneAt: "2026-09-11 09:00:00",
        });
      }
    }
  }

  console.log("Seeded local D1 with Statixx and Trazo demo data.");
  await proxy.dispose();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
