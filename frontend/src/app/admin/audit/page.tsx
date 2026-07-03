"use client";

import { SuperAdminPageGuard } from "../SuperAdminPageGuard";
import AdminAuditPage from "./AdminAuditPage";

export default function AuditPage() {
  return (
    <SuperAdminPageGuard>
      <AdminAuditPage />
    </SuperAdminPageGuard>
  );
}
