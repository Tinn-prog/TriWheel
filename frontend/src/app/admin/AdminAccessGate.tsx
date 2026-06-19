"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useSyncExternalStore } from "react";

type StoredUser = {
  name: string;
  email: string;
  role: string;
};

const serverSnapshot = "__triwheel_server_snapshot__";

let cachedStoredUserValue: string | null = null;
let cachedStoredUser: StoredUser | null = null;

function getStoredTriWheelUserValue(): string {
  if (typeof window === "undefined") {
    return serverSnapshot;
  }

  return localStorage.getItem("triwheel_user") ?? "";
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

export function AdminAccessGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isChecking, user } = useStoredTriWheelSession();

  useEffect(() => {
    if (!isChecking && user?.role !== "admin") {
      router.replace("/login?role=passenger");
    }
  }, [isChecking, router, user]);

  if (isChecking || user?.role !== "admin") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-300">
            Admin Access
          </p>
          <h1 className="mt-3 text-3xl font-black">Checking session...</h1>
        </div>
      </main>
    );
  }

  return children;
}
