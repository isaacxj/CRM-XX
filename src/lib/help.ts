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
    body: "Import companies and contacts from a CSV by mapping columns and previewing before you commit, then use Find duplicates on Companies to merge any company entered twice. Export companies, contacts, deals, activities, and tasks as CSV, per business or all.",
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
