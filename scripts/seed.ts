import { getPlatformProxy } from "wrangler";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "../src/server/db/schema";

// Two owners so the Mine / Everyone filter has something to filter.
const OWNERS = [
  process.env.DEV_USER_EMAIL?.toLowerCase() || "you@example.com",
  "teammate@example.com",
];

const utc = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
const daysAgo = (n: number) => utc(new Date(Date.now() - n * 86_400_000));

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

  await db.delete(schema.dealEvents);
  await db.delete(schema.tasks);
  await db.delete(schema.activities);
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
      // One prospect per business has had nothing for a month, so Home's
      // Going cold list has something to show.
      const cold = index === 2;
      const coldStamp = { createdAt: daysAgo(35), updatedAt: daysAgo(35) };
      const when = (recent: string, coldDays: number) =>
        cold ? daysAgo(coldDays) : recent;
      const [inserted] = await db
        .insert(schema.companies)
        .values({
          business,
          name: company.name,
          website: `https://${company.name.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
          status: company.status,
          source: company.source,
          ...(cold ? coldStamp : {}),
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
      const [deal] = await db
        .insert(schema.deals)
        .values({
          companyId: inserted.id,
          title: `${company.name} ${business === "statixx" ? "engagement" : "subscription"}`,
          stage,
          createdAt: when("2026-09-05 12:00:00", 35),
          ...(cold ? { updatedAt: daysAgo(35) } : {}),
          amountCents:
            business === "statixx"
              ? 25_000_00 + index * 5_000_00
              : 500_00 + index * 100_00,
          billing: business === "statixx" ? "one_time" : "monthly",
          closeDate: stage === "won" || stage === "lost" ? "2026-08-15" : null,
          lostReason: stage === "lost" ? "Budget cut" : null,
        })
        .returning();

      // Walk each seeded deal through the stages before its current one.
      const stageList: readonly schema.DealStage[] = stages;
      const path = stageList.slice(0, stageList.indexOf(stage) + 1);
      for (const [step, toStage] of path.slice(1).entries()) {
        const day = String(10 + step * 3).padStart(2, "0");
        await db.insert(schema.dealEvents).values({
          dealId: deal.id,
          fromStage: path[step],
          toStage,
          createdAt: when(`2026-09-${day} 15:00:00`, 34 - step),
        });
      }

      const seededActivities = await db
        .insert(schema.activities)
        .values([
          {
            companyId: inserted.id,
            type: "note",
            body: `Initial ${business === "statixx" ? "discovery call" : "demo"} went well.`,
            occurredAt: when("2026-09-20 15:00:00", 33),
          },
          {
            companyId: inserted.id,
            type: "email_sent",
            subject: "Following up on our conversation",
            body: "Sent follow-up materials after the call.",
            occurredAt: when("2026-09-22 14:30:00", 31),
          },
          {
            companyId: inserted.id,
            type: company.status === "client" ? "meeting" : "call",
            subject:
              company.status === "client" ? "Quarterly check-in" : "Intro call",
            body:
              company.status === "client"
                ? "Checked in — happy with progress so far."
                : "",
            occurredAt: when("2026-09-25 16:00:00", 30),
          },
        ])
        .returning();

      // Meetings in the coming days, so Home has something under Upcoming.
      if (index % 3 === 1) {
        const start = new Date();
        start.setUTCDate(start.getUTCDate() + 1 + (index % 5));
        start.setUTCHours(15, 0, 0, 0);
        const end = new Date(start);
        end.setUTCMinutes(45);
        await db.insert(schema.activities).values({
          companyId: inserted.id,
          type: "meeting",
          subject: `${company.status === "client" ? "Review" : "Intro"} with ${company.name}`,
          occurredAt: utc(start),
          endsAt: utc(end),
          ownerEmail: OWNERS[index % 2],
        });
      }

      // Every third company is still waiting on a reply to the sent email:
      // half of them past due, the rest not yet.
      if (index % 3 === 0) {
        const sentEmail = seededActivities.find((a) => a.type === "email_sent");
        await db.insert(schema.tasks).values({
          companyId: inserted.id,
          title: `Waiting on reply: ${sentEmail?.subject ?? "sent email"}`,
          dueDate: index % 2 === 0 ? "2026-09-25" : "2026-10-06",
          kind: "awaiting_reply",
          ownerEmail: OWNERS[index % 2],
          activityId: sentEmail?.id,
        });
      }

      if (index % 2 === 0) {
        await db.insert(schema.tasks).values({
          companyId: inserted.id,
          title: `Follow up with ${company.name}`,
          ...(cold ? coldStamp : {}),
          ownerEmail: OWNERS[index % 2],
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
          ownerEmail: OWNERS[index % 2],
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
