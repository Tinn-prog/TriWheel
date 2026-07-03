"use client";

import { useStoredTriWheelSession } from "@/app/admin/AdminAccessGate";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

export function SuperAdminPageGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isChecking, user } = useStoredTriWheelSession();

  useEffect(() => {
    if (!isChecking && user?.role === "admin" && user.admin_role !== "super_admin") {
      router.replace("/admin");
    }
  }, [isChecking, router, user]);

  if (
    isChecking ||
    user?.role !== "admin" ||
    user.admin_role !== "super_admin"
  ) {
    return null;
  }

  return children;
}
