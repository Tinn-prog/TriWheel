"use client";

import {
  adminHomeForRole,
  formatAdminRoleLabel,
  loginPathForPortal,
  type AdminPortal,
} from "@/lib/adminRoles";
import { readStoredUserRaw } from "@/lib/authStorage";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useSyncExternalStore } from "react";

type StoredUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  admin_role?: string | null;
};

const serverSnapshot = "__triwheel_server_snapshot__";

let cachedStoredUserValue: string | null = null;
let cachedStoredUser: StoredUser | null = null;

function getStoredTriWheelUserValue(): string {
  if (typeof window === "undefined") {
    return serverSnapshot;
  }

  return readStoredUserRaw();
}

export function parseStoredTriWheelUser(storedUser: string): StoredUser | null {
  try {
    if (storedUser === cachedStoredUserValue) {
      return cachedStoredUser;
    }

    cachedStoredUserValue = storedUser;
    cachedStoredUser = storedUser ? (JSON.parse(storedUser) as StoredUser) : null;

    return cachedStoredUser;
  } catch {
    cachedStoredUserValue = null;
    cachedStoredUser = null;

    return null;
  }
}

function subscribeToStoredUser(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("triwheel_user_change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("triwheel_user_change", onStoreChange);
  };
}

export function useStoredTriWheelSession() {
  const storedUserValue = useSyncExternalStore(
    subscribeToStoredUser,
    getStoredTriWheelUserValue,
    () => serverSnapshot,
  );

  return {
    isChecking: storedUserValue === serverSnapshot,
    user:
      storedUserValue === serverSnapshot
        ? null
        : parseStoredTriWheelUser(storedUserValue),
  };
}

export function useStoredTriWheelUser() {
  return useStoredTriWheelSession().user;
}

function AccessCheckingScreen({
  portal,
  title,
}: {
  portal: AdminPortal;
  title: string;
}) {
  return (
    <main
      className={`grid min-h-screen place-items-center px-6 text-white ${
        portal === "superadmin" ? "bg-[#1a0a0a]" : "bg-slate-950"
      }`}
    >
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <p
          className={`text-sm font-bold uppercase tracking-[0.25em] ${
            portal === "superadmin" ? "text-red-300" : "text-orange-300"
          }`}
        >
          {portal === "superadmin" ? "Super Admin Access" : "Admin Access"}
        </p>
        <h1 className="mt-3 text-3xl font-black">{title}</h1>
      </div>
    </main>
  );
}

export function AdminAccessGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isChecking, user } = useStoredTriWheelSession();

  useEffect(() => {
    if (isChecking) {
      return;
    }

    if (user?.role !== "admin") {
      router.replace(loginPathForPortal("admin"));
      return;
    }

    if (user.admin_role === "super_admin") {
      router.replace("/superadmin");
    }
  }, [isChecking, router, user]);

  if (
    isChecking ||
    user?.role !== "admin" ||
    user.admin_role === "super_admin"
  ) {
    return <AccessCheckingScreen portal="admin" title="Checking session..." />;
  }

  return children;
}

export function SuperAdminAccessGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isChecking, user } = useStoredTriWheelSession();

  useEffect(() => {
    if (isChecking) {
      return;
    }

    if (user?.role !== "admin") {
      router.replace(loginPathForPortal("superadmin"));
      return;
    }

    if (user.admin_role !== "super_admin") {
      router.replace(loginPathForPortal("admin"));
    }
  }, [isChecking, router, user]);

  if (
    isChecking ||
    user?.role !== "admin" ||
    user.admin_role !== "super_admin"
  ) {
    return <AccessCheckingScreen portal="superadmin" title="Checking session..." />;
  }

  return children;
}

export function adminHomePathForUser(user: StoredUser | null) {
  if (user?.role !== "admin") {
    return null;
  }

  return adminHomeForRole(user.admin_role);
}

export { formatAdminRoleLabel };
