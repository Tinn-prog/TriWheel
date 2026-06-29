import type { AppNavItem } from "@/components/AppShell";

export const driverNavItems: AppNavItem[] = [
  {
    href: "/driver",
    isDefaultSection: true,
    label: "Dashboard",
    shortLabel: "Home",
  },
  { href: "/driver/requests", label: "Ride Requests", shortLabel: "Requests" },
  { href: "/driver/notifications", label: "Notifications", shortLabel: "Alerts" },
  { href: "/driver/history", label: "Ride History", shortLabel: "History" },
  { href: "/driver/vehicle", label: "Vehicle", shortLabel: "Vehicle" },
  { href: "/settings", label: "Profile", shortLabel: "Profile" },
];
