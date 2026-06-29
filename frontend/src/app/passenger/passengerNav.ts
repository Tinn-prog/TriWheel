import type { AppNavItem } from "@/components/AppShell";

export const passengerNavItems: AppNavItem[] = [
  {
    href: "/passenger#book-ride",
    icon: "book",
    isDefaultSection: true,
    label: "Book Ride",
    shortLabel: "Book",
  },
  {
    href: "/passenger#active-ride",
    icon: "active",
    label: "Active Ride",
    shortLabel: "Active",
  },
  {
    href: "/passenger/messages",
    icon: "messages",
    label: "Messages",
    shortLabel: "Messages",
  },
  {
    href: "/passenger/notifications",
    icon: "alerts",
    label: "Notifications",
    shortLabel: "Notifications",
  },
  {
    href: "/passenger/history",
    icon: "history",
    label: "Ride History",
    shortLabel: "History",
  },
  { href: "/settings", icon: "profile", label: "Profile", shortLabel: "Profile" },
];
