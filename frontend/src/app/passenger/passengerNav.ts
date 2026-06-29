import type { AppNavItem } from "@/components/AppShell";

export const passengerNavItems: AppNavItem[] = [
  {
    href: "/passenger#book-ride",
    isDefaultSection: true,
    label: "Book Ride",
    shortLabel: "Book",
  },
  { href: "/passenger#active-ride", label: "Active Ride", shortLabel: "Active" },
  { href: "/passenger/notifications", label: "Notifications", shortLabel: "Alerts" },
  { href: "/passenger/history", label: "Ride History", shortLabel: "History" },
  { href: "/settings", label: "Profile", shortLabel: "Profile" },
];
