"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { SuperAdminAccessGate } from "../admin/AdminAccessGate";
import { AdminShell } from "../admin/AdminShell";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/superadmin/login") {
    return children;
  }

  return (
    <SuperAdminAccessGate>
      <AdminShell portal="superadmin">{children}</AdminShell>
    </SuperAdminAccessGate>
  );
}
