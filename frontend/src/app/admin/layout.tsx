import { ReactNode } from "react";
import { AdminAccessGate } from "./AdminAccessGate";
import { AdminShell } from "./AdminShell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAccessGate>
      <AdminShell>{children}</AdminShell>
    </AdminAccessGate>
  );
}
