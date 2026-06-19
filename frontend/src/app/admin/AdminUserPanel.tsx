"use client";

import { useRouter } from "next/navigation";
import { useStoredTriWheelSession } from "./AdminAccessGate";

export function AdminUserPanel() {
  const router = useRouter();
  const { user } = useStoredTriWheelSession();

  function handleLogout() {
    localStorage.removeItem("triwheel_user");
    window.dispatchEvent(new Event("triwheel_user_change"));
    router.replace("/login?role=passenger");
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300">
        Signed in as
      </p>
      <div className="mt-3 font-black text-white">
        {user?.name ?? "Admin"}
      </div>
      <div className="mt-1 break-all text-xs text-slate-400">
        {user?.email ?? "admin account"}
      </div>
      <button
        className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
        onClick={handleLogout}
        type="button"
      >
        Logout
      </button>
    </div>
  );
}
