"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { AdminAccessGate } from "./AdminAccessGate";
import { AdminShell } from "./AdminShell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return children;
  }

  return (
    <AdminAccessGate>
      <AdminShell>{children}</AdminShell>
    </AdminAccessGate>
  );
}
