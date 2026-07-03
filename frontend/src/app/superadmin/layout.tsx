import { ReactNode } from "react";
import { SuperAdminAccessGate } from "../admin/AdminAccessGate";
import { AdminShell } from "../admin/AdminShell";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <SuperAdminAccessGate>
      <AdminShell portal="superadmin">{children}</AdminShell>
    </SuperAdminAccessGate>
  );
}
