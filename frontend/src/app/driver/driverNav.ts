import type { AppNavItem } from "@/components/AppShell";

export const driverNavItems: AppNavItem[] = [
  {
    href: "/driver",
    icon: "home",
    isDefaultSection: true,
    label: "Dashboard",
    shortLabel: "Home",
  },
  {
    href: "/driver/requests",
    icon: "requests",
    label: "Ride Requests",
    shortLabel: "Requests",
  },
  {
    href: "/driver/messages",
    icon: "messages",
    label: "Messages",
    shortLabel: "Messages",
  },
  {
    href: "/driver/notifications",
    icon: "alerts",
    label: "Notifications",
    shortLabel: "Notifications",
  },
  {
    href: "/driver/history",
    icon: "history",
    label: "Ride History",
    shortLabel: "History",
  },
  { href: "/driver/vehicle", icon: "vehicle", label: "Vehicle", shortLabel: "Vehicle" },
  { href: "/settings", icon: "profile", label: "Profile", shortLabel: "Profile" },
];
