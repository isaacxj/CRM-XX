import {
  BarChart3,
  Building2,
  CheckSquare,
  Download,
  Handshake,
  Home,
  Mail,
  Palette,
  Search,
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
    items: [{ href: "/design", label: "Design", Icon: Palette }],
  },
];
