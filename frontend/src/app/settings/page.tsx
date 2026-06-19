"use client";

import { useStoredTriWheelSession } from "@/app/admin/AdminAccessGate";
import { TriWheelLoadingScreen } from "@/components/TriWheelLoadingScreen";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

type StoredUser = {
  id?: number;
  name: string;
  email: string;
  role: string;
  is_verified?: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  const { isChecking, user } = useStoredTriWheelSession() as {
    isChecking: boolean;
    user: StoredUser | null;
  };

  useEffect(() => {
    if (!isChecking && !user) {
      router.replace("/login?role=passenger");
    }
  }, [isChecking, router, user]);

  const dashboardHref = useMemo(() => {
    if (user?.role === "driver") {
      return "/driver";
    }

    if (user?.role === "admin") {
      return "/admin";
    }

    return "/passenger";
  }, [user]);

  function handleLogout() {
    localStorage.removeItem("triwheel_user");
    window.dispatchEvent(new Event("triwheel_user_change"));
    router.replace("/login?role=passenger");
  }

  if (isChecking || !user) {
    return (
      <TriWheelLoadingScreen
        message="Checking your account session before opening settings."
        title="Opening Account Settings"
      />
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <section className="mx-auto w-full max-w-6xl min-w-0">
        <header className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-orange-500 via-orange-600 to-orange-800 p-5 text-white shadow-xl shadow-orange-200 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-100 sm:text-sm">
                Account Center
              </p>
              <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
                Account Settings
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-orange-50 sm:mt-3 sm:text-base">
                Manage your profile, security, notifications, and account access
                in one place.
              </p>
            </div>
            <Link
              className="inline-flex w-fit rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-orange-700 sm:px-5 sm:py-3"
              href={dashboardHref}
            >
              Back to Dashboard
            </Link>
          </div>
        </header>

        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-4">
              <div className="grid size-16 place-items-center rounded-3xl bg-orange-500 text-2xl font-black text-white shadow-lg shadow-orange-500/25">
                {user.name.charAt(0)}
              </div>
              <div>
                <div className="text-xl font-black">{user.name}</div>
                <div className="mt-1 text-sm text-slate-500">{user.email}</div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 text-sm">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-bold text-slate-500">Role</p>
                <p className="mt-1 font-black capitalize">{user.role}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-bold text-slate-500">Verification</p>
                <p className="mt-1 font-black">
                  {user.is_verified ? "Verified" : "Pending or not required"}
                </p>
              </div>
            </div>

            <button
              className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          </aside>

          <section className="grid gap-6">
            <article className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-600">
                Profile
              </p>
              <h2 className="mt-2 text-2xl font-black">Personal Information</h2>
              <p className="mt-2 text-sm text-slate-500">
                These fields are ready for the profile update API. For now they
                show the account data saved from login.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  Display name
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    defaultValue={user.name}
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Email address
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    defaultValue={user.email}
                    type="email"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                  Contact number
                  <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    placeholder="Add contact number"
                  />
                </label>
              </div>
            </article>

            <article className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-600">
                Security
              </p>
              <h2 className="mt-2 text-2xl font-black">Password</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="Current password"
                  type="password"
                />
                <input
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  placeholder="New password"
                  type="password"
                />
              </div>
            </article>

            <article className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-600">
                Preferences
              </p>
              <h2 className="mt-2 text-2xl font-black">Notifications</h2>
              <div className="mt-5 grid gap-3">
                {["Ride status updates", "Driver offer alerts", "Account security alerts"].map(
                  (item) => (
                    <label
                      className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 text-sm font-bold"
                      key={item}
                    >
                      {item}
                      <input
                        className="size-5 accent-orange-500"
                        defaultChecked
                        type="checkbox"
                      />
                    </label>
                  ),
                )}
              </div>
            </article>
          </section>
        </div>
      </section>
    </main>
  );
}
