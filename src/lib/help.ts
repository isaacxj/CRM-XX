export type HelpEntry = {
  id: string;
  title: string;
  href?: string;
  body: string;
  tips?: string[];
};

export const HELP_ENTRIES: HelpEntry[] = [
  {
    id: "today",
    title: "Today",
    href: "/",
    body: "Home answers what to do today: overdue and due-today follow-ups, replies you are still waiting on, meetings in the next 7 days, prospects going cold, and a pipeline snapshot.",
    tips: [
      "Complete or snooze a follow-up in place with the buttons on its row.",
      "Going cold lists prospects and open deals untouched for 14 days or more.",
    ],
  },
  {
    id: "companies",
    title: "Companies",
    href: "/companies",
    body: "Every prospect, client, and past client, tagged Statixx or Trazo. Filter by business and status, search by name, and sort by last activity.",
    tips: [
      "Tick rows to set a status, move to the other business, or archive. Archive has an Undo toast.",
      "Save a filter combination with Save view and reopen it from the chips above the list.",
      "Pin a company from its page to keep it in the sidebar.",
    ],
  },
  {
    id: "company-page",
    title: "Company page",
    body: "Details, contacts, and deals on the left; the timeline on the right. Log a note, email, call, or meeting from the composer, and edit company fields inline.",
    tips: [
      "Logging a sent email can start a remind-me-in-N-days reminder (default 3). Press Got reply when they answer.",
      "The timeline merges activities, finished follow-ups, new deals, and stage changes.",
    ],
  },
  {
    id: "contacts",
    title: "Contacts",
    href: "/contacts",
    body: "People at each company. Add them from the company page or import them from a CSV, then find them here by name or email.",
  },
  {
    id: "activity",
    title: "Activity",
    href: "/activity",
    body: "Every note, email, call, and meeting across all companies, newest first. Filter by type, business, or owner, and search subjects, details, and names.",
  },
  {
    id: "closing",
    title: "Closing",
    href: "/closing",
    body: "Open deals grouped by expected close date: past its date, next 7 days, within 30 days, later, and no date, with a count and total for each group. Filter by business or search deals and companies.",
    tips: [
      "Deals past their close date are marked in red; set a new date on the company page.",
    ],
  },
  {
    id: "review",
    title: "Review",
    href: "/review",
    body: "A look back over the last 7, 14 or 30 days: deals won and lost with their value, companies added, what you logged by type, and follow-ups finished. Filter by business.",
    tips: [
      "A deal counts as won or lost on the day it was moved to that stage.",
    ],
  },
  {
    id: "workload",
    title: "Workload",
    href: "/workload",
    body: "One row per person: open follow-ups and emails waiting on a reply (with how many are overdue), meetings in the next 7 days, and what they logged in the last 7 days. Filter by business.",
    tips: [
      "Items with no owner, such as older entries, are grouped under No owner.",
    ],
  },
  {
    id: "stalled",
    title: "Stalled",
    href: "/stalled",
    body: "Open deals grouped by how long they have sat in their current stage: 60 days or more, 30 to 59, 14 to 29, and under 14, with a count and total for each group. Filter by business or search deals and companies.",
    tips: ["Moving a deal to another stage resets its clock."],
  },
  {
    id: "check-ins",
    title: "Client check-ins",
    href: "/check-ins",
    body: "Lists clients nobody has touched for 30, 60 or 90 days or more, quietest first, with the date of the last activity and whether a follow-up is already open. Use Check in tomorrow, in a week or in a month to add a Check in follow-up on the company, or open the company to log a call. Filter by business or search by name.",
    tips: [
      "Logging anything on the company, or finishing a task, counts as activity and removes it from the list.",
    ],
  },
  {
    id: "funnel",
    title: "Funnel",
    href: "/funnel",
    body: "Shows how far deals get through each business's pipeline. For every stage you see how many deals reached it, the share of the previous stage that made it, and how many are there now, with the win rate and how long won deals took. Filter by business.",
    tips: [
      "A deal counts as reaching a stage if it is there, passed through it, or went on to a later stage; lost deals count up to the furthest stage they reached.",
    ],
  },
  {
    id: "sources",
    title: "Sources",
    href: "/sources",
    body: "Shows where your companies come from, using the source field on each company. For every source you see how many companies it brought, how many became clients, how many won a deal, the open pipeline and the revenue won. Click a source to list its companies, and filter by business.",
    tips: [
      "Sources match ignoring capital letters and extra spaces, so Referral and referral count together.",
      "Companies with a blank source are grouped as No source; fill them in on Data gaps.",
    ],
  },
  {
    id: "won",
    title: "Won deals",
    href: "/won",
    body: "Every deal you won, newest first, with the value, how many days it took from creation to win, and a monthly total for subscription deals. Make client updates a company that is still a prospect, and In 30 days or In 90 days adds a check-in follow-up on the company. Filter by business or search by deal or company.",
    tips: [
      "Make client only appears while the company is still marked as a prospect.",
    ],
  },
  {
    id: "lost",
    title: "Lost deals",
    href: "/lost",
    body: "Every deal you lost, newest first, with the reason, value and how long ago. Click a reason to see only those. Reopen puts a deal back in the first stage of its pipeline, and In 30 days or In 90 days adds a follow-up on the company so you remember to try again. Filter by business or search by deal or company.",
    tips: [
      "Reopening records a stage change, so it shows on the company timeline.",
    ],
  },
  {
    id: "next-steps",
    title: "No next step",
    href: "/next-steps",
    body: "Prospects and clients with no open follow-up and no meeting coming up, stalest first, with when you last touched them and how many deals are open. Schedule a follow-up in one click: tomorrow, in 3 days, or next week. Filter by business or search by name.",
    tips: [
      "A company drops off this list as soon as it has an open follow-up.",
    ],
  },
  {
    id: "data-gaps",
    title: "Data gaps",
    href: "/data-gaps",
    body: "Missing details across your records, with a form on each row to fill them in. Company details lists companies with no website or source, No contacts lists prospects and clients with nobody to talk to, and Contact emails lists people with no email address. Filter by business.",
    tips: [
      "Saving only fills blanks, so it never overwrites something already entered.",
    ],
  },
  {
    id: "meetings",
    title: "Meetings",
    href: "/meetings",
    body: "Every meeting logged on a company, with tabs for upcoming and past. Filter by business or owner, and search subjects, details, and names.",
  },
  {
    id: "tasks",
    title: "Tasks",
    href: "/tasks",
    body: "Every follow-up in one place, grouped by due date, with tabs for overdue, today, upcoming, waiting on reply, and done. Tasks don't need a company.",
    tips: [
      "Snooze moves a follow-up to tomorrow, in 3 days, or next week.",
      "Use Mine / Everyone to see only your own follow-ups.",
    ],
  },
  {
    id: "deals",
    title: "Deals",
    href: "/deals",
    body: "A board with one column per stage for the selected business, or a list. Drag a card to change its stage, or use the stage select on a phone or keyboard.",
    tips: [
      "Moving a deal to Lost asks for a reason.",
      "Click a deal to open its panel with details and stage history.",
    ],
  },
  {
    id: "revenue",
    title: "Revenue",
    href: "/revenue",
    body: "Open pipeline by stage, won this month and quarter versus the last period, win rate over 90 days, and MRR from won monthly deals.",
  },
  {
    id: "import-export",
    title: "Import and export",
    href: "/export",
    body: "Import companies and contacts from a CSV by mapping columns and previewing before you commit, then use Find duplicates on Companies or Contacts to merge anything entered twice. Export companies, contacts, deals, activities, and tasks as CSV, per business or all.",
  },
  {
    id: "logging",
    title: "Email logging address",
    href: "/settings",
    body: "BCC the logging address on client emails, and forward replies and calendar invites to it. The CRM logs them and updates follow-ups for you. The address is shown on Settings.",
  },
  {
    id: "digest",
    title: "Morning digest",
    href: "/digest",
    body: "Each person gets an email on weekday mornings with overdue follow-ups, replies still pending, and today's meetings. Preview what each person would get on the digest page.",
  },
  {
    id: "search",
    title: "Search and the command palette",
    body: "Press / to search companies, contacts, and deals. Press ⌘K or Ctrl+K to jump to any page, run quick actions, switch business, change theme, or reopen your last five companies.",
  },
];

export type ReleaseNote = { stage: string; title: string; items: string[] };

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    stage: "Stage 5",
    title: "Release readiness",
    items: [
      "Bad input shows a clear message instead of an error page.",
      "Long lists are paged, and every page stays fast with thousands of records.",
      "Bulk actions and saved views on Companies.",
      "Pin companies to the sidebar; the palette shows your recent companies.",
      "Closing page: open deals by expected close date.",
      "Stalled page: open deals by how long they have sat in their stage.",
      "Review page: a weekly look back at deals won and lost, activity and finished follow-ups.",
      "Workload page: open follow-ups, replies and meetings per person.",
      "No next step page: prospects and clients with nothing planned, with one-click follow-ups.",
      "Data gaps page: companies and contacts with missing details, fixed in place.",
      "Duplicate contacts: Find duplicates on Contacts merges people entered twice at the same company.",
      "This Help page.",
    ],
  },
  {
    stage: "Stage 4",
    title: "Design overhaul",
    items: [
      "New look with light, dark, and match-system themes and an accent per business.",
      "Collapsible sidebar, top bar with breadcrumbs, and a phone bottom nav.",
      "Command palette on ⌘K and a keyboard shortcuts sheet on ?.",
      "Today page, company page with timeline composer, deal panel, and Revenue charts.",
      "Side-sheet forms, snooze on follow-ups, undo for archive, and Settings.",
    ],
  },
  {
    stage: "Stage 3",
    title: "Daily driver",
    items: [
      "Tasks page, typed activities (email, call, meeting), and waiting-on-reply reminders.",
      "Meetings with owners and a Mine / Everyone filter.",
      "Morning digest email and a logging address for BCC'd and forwarded mail.",
      "Company timeline, last activity and Going cold, drag-and-drop deals board.",
      "Revenue view, global search, and CSV export.",
    ],
  },
];
