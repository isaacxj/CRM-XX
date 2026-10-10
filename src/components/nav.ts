import {
  BarChart3,
  Activity,
  CalendarClock,
  CalendarDays,
  Building2,
  CheckSquare,
  Download,
  Handshake,
  HelpCircle,
  Home,
  Mail,
  Palette,
  Search,
  Hourglass,
  CircleSlash,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; Icon: LucideIcon };

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Work",
    items: [
      { href: "/", label: "Home", Icon: Home },
      { href: "/tasks", label: "Tasks", Icon: CheckSquare },
      { href: "/deals", label: "Deals", Icon: Handshake },
      { href: "/closing", label: "Closing", Icon: CalendarClock },
      { href: "/stalled", label: "Stalled", Icon: Hourglass },
      { href: "/next-steps", label: "No next step", Icon: CircleSlash },
      { href: "/activity", label: "Activity", Icon: Activity },
      { href: "/meetings", label: "Meetings", Icon: CalendarDays },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/companies", label: "Companies", Icon: Building2 },
      { href: "/contacts", label: "Contacts", Icon: Users },
      { href: "/search", label: "Search", Icon: Search },
    ],
  },
  {
    label: "Reports",
    items: [
      { href: "/revenue", label: "Revenue", Icon: BarChart3 },
      { href: "/digest", label: "Morning digest", Icon: Mail },
      { href: "/export", label: "Export", Icon: Download },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", label: "Settings", Icon: Settings },
      { href: "/help", label: "Help", Icon: HelpCircle },
      { href: "/design", label: "Design", Icon: Palette },
    ],
  },
];
