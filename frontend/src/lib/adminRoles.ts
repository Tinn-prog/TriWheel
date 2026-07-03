export type AdminPortal = "admin" | "superadmin";

export const operatorNavItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/emergency", label: "Emergency" },
  { href: "/admin/map", label: "Live Map" },
  { href: "/admin/drivers", label: "Drivers" },
  { href: "/admin/passengers", label: "Passengers" },
  { href: "/admin/rides", label: "Rides" },
  { href: "/admin/reports", label: "Reports" },
] as const;

export const superAdminNavItems = [
  { href: "/superadmin", label: "Governance" },
  { href: "/superadmin/operations", label: "Operations Overview" },
  { href: "/superadmin/emergency", label: "Emergency" },
  { href: "/superadmin/map", label: "Live Map" },
  { href: "/superadmin/drivers", label: "Drivers" },
  { href: "/superadmin/passengers", label: "Passengers" },
  { href: "/superadmin/rides", label: "Rides" },
  { href: "/superadmin/reports", label: "Reports" },
  { href: "/superadmin/users", label: "User Accounts" },
  { href: "/superadmin/settings", label: "Platform Settings" },
  { href: "/superadmin/audit", label: "Audit Log" },
  { href: "/superadmin/analytics", label: "Analytics & Exports" },
] as const;

export const superAdminOnlyAdminPaths = [
  "/admin/users",
  "/admin/settings",
  "/admin/audit",
  "/admin/analytics",
] as const;

export function formatAdminRoleLabel(adminRole?: string | null) {
  if (adminRole === "super_admin") {
    return "Super Admin";
  }

  return "Admin Operator";
}

export function adminHomeForRole(adminRole?: string | null) {
  return adminRole === "super_admin" ? "/superadmin" : "/admin";
}

export function loginPathForAdminRole(adminRole?: string | null) {
  return adminRole === "super_admin" ? "/superadmin/login" : "/admin/login";
}

export function loginPathForPortal(portal: AdminPortal) {
  return portal === "superadmin" ? "/superadmin/login" : "/admin/login";
}

export function portalFromLoginRole(role?: string | null): AdminPortal | null {
  if (role === "superadmin") {
    return "superadmin";
  }

  if (role === "admin") {
    return "admin";
  }

  return null;
}
