"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isSuperAdmin } from "@/lib/adminApi";

export default function AdminUsersLegacyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(isSuperAdmin() ? "/superadmin/users" : "/admin");
  }, [router]);

  return null;
}
