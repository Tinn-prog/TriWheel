"use client";

import {
  formatAdminRoleLabel,
  loginPathForAdminRole,
  type AdminPortal,
} from "@/lib/adminRoles";
import { logoutTriWheel } from "@/lib/logout";
import { LogoutConfirmButton } from "@/components/LogoutConfirmButton";
import Link from "next/link";
import { useStoredTriWheelSession } from "./AdminAccessGate";

export function AdminUserPanel({ portal = "admin" }: { portal?: AdminPortal }) {
  const { user } = useStoredTriWheelSession();
  const roleLabel = formatAdminRoleLabel(user?.admin_role);
  const alternatePortal =
    user?.admin_role === "super_admin"
      ? { href: portal === "superadmin" ? "/admin" : "/superadmin", label: portal === "superadmin" ? "Open Operations Console" : "Open Super Admin Console" }
      : null;

  function handleLogout() {
    void logoutTriWheel(loginPathForAdminRole(user?.admin_role));
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <p
        className={`text-xs font-bold uppercase tracking-[0.22em] ${
          portal === "superadmin" ? "text-red-300" : "text-orange-300"
        }`}
      >
        Signed in as
      </p>
      <div className="mt-3 font-black text-white">{user?.name ?? "Admin"}</div>
      <div className="mt-1 break-all text-xs text-slate-400">
        {user?.email ?? "admin account"}
      </div>
      <p className="mt-2 text-xs font-bold text-white/80">{roleLabel}</p>
      {alternatePortal ? (
        <Link
          className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15"
          href={alternatePortal.href}
        >
          {alternatePortal.label}
        </Link>
      ) : null}
      <LogoutConfirmButton
        className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-black text-white shadow-lg transition ${
          portal === "superadmin"
            ? "bg-red-600 shadow-red-500/20 hover:bg-red-500"
            : "bg-orange-500 shadow-orange-500/20 hover:bg-orange-600"
        }`}
        onConfirm={handleLogout}
      />
    </div>
  );
}
