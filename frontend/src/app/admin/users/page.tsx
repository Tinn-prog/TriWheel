"use client";

import { apiRoutes } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { AdminModuleShell, statusClass } from "../AdminModuleShell";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  contact_number: string | null;
  role: string;
  is_verified: boolean;
  rides_count: number;
  created_at: string;
};

export default function AdminUsersPage() {
  const [error, setError] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);

  const loadUsers = useCallback(async () => {
    const response = await fetch(apiRoutes.adminUsers);
    const data = (await response.json()) as {
      message?: string;
      users?: AdminUser[];
    };

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load users.");
    }

    setUsers(data.users ?? []);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        await loadUsers();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : "Unable to load users.",
        );
      }
    }

    void load();
  }, [loadUsers]);

  return (
    <AdminModuleShell
      description="Review account roles, contact details, verification state, and ride activity."
      title="User Management"
    >
      {error && (
        <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">
          {error}
        </div>
      )}

      <section className="mt-6 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">All Accounts</h2>
            <p className="mt-1 text-sm text-slate-500">
              Total records: {users.length}
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="py-3">Name</th>
                <th className="py-3">Role</th>
                <th className="py-3">Contact</th>
                <th className="py-3">Verified</th>
                <th className="py-3">Rides</th>
                <th className="py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="py-4">
                    <div className="font-black">{user.name}</div>
                    <div className="text-slate-500">{user.email}</div>
                  </td>
                  <td className="py-4 capitalize text-slate-600">{user.role}</td>
                  <td className="py-4 text-slate-600">
                    {user.contact_number ?? "N/A"}
                  </td>
                  <td className="py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        user.is_verified
                          ? statusClass("verified")
                          : statusClass("unverified")
                      }`}
                    >
                      {user.is_verified ? "verified" : "unverified"}
                    </span>
                  </td>
                  <td className="py-4 font-black">{user.rides_count}</td>
                  <td className="py-4 text-slate-600">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminModuleShell>
  );
}
