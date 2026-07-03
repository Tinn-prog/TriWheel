"use client";

import { SuperAdminPageGuard } from "../SuperAdminPageGuard";
import AdminAnalyticsPage from "./AdminAnalyticsPage";

export default function AnalyticsPage() {
  return (
    <SuperAdminPageGuard>
      <AdminAnalyticsPage />
    </SuperAdminPageGuard>
  );
}
