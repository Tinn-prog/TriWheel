"use client";

import { adminGet, adminPost, apiRoutes } from "@/lib/adminApi";
import { formatAdminRoleLabel } from "@/lib/adminRoles";
import { formatDateTime } from "@/lib/formatDateTime";
import { useCallback, useEffect, useState } from "react";
import { AdminFilterBar, AdminFilterField, adminInputClass, useDebouncedValue } from "../../admin/AdminFilters";
import { AdminModuleShell, statusClass } from "../../admin/AdminModuleShell";
import { SuperAdminPageGuard } from "../../admin/SuperAdminPageGuard";

type DeletedUser = {
  id: number;
  name: string;
  email: string;
  contact_number: string | null;
  role: string;
  admin_role: string | null;
  rides_count: number;
  deleted_at: string | null;
  deletion_reason: string | null;
  deleted_by_name: string | null;
  purge_at: string | null;
  retention_months: number;
  has_restore_appeal: boolean;
  restore_appeal_message: string | null;
  restore_appeal_submitted_at: string | null;
};

function retentionLabel(user: DeletedUser): string {
  if (!user.purge_at) {
    return `${user.retention_months || 3}-month retention`;
  }

  const msLeft = new Date(user.purge_at).getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    return "Due for permanent purge";
  }

  if (daysLeft === 1) {
    return "1 day left";
  }

  return `${daysLeft} days left`;
}

export default function DeletedAccountsPage() {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [users, setUsers] = useState<DeletedUser[]>([]);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [adminRoleFilter, setAdminRoleFilter] = useState("");
  const [retentionFilter, setRetentionFilter] = useState("");
  const [appealFilter, setAppealFilter] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const hasActiveFilters = Boolean(
    search || roleFilter || adminRoleFilter || retentionFilter || appealFilter,
  );

  const loadUsers = useCallback(async () => {
    const response = await adminGet(apiRoutes.adminUsersTrashed, {
      role: roleFilter || undefined,
      admin_role: adminRoleFilter || undefined,
      retention: retentionFilter || undefined,
      appeal: appealFilter || undefined,
      search: debouncedSearch || undefined,
    });
    const data = (await response.json()) as { message?: string; users?: DeletedUser[] };

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load deleted accounts.");
    }

    setUsers(data.users ?? []);
  }, [adminRoleFilter, appealFilter, debouncedSearch, retentionFilter, roleFilter]);

  useEffect(() => {
    void loadUsers().catch((caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load deleted accounts.");
    });
  }, [loadUsers]);

  function clearFilters() {
    setSearch("");
    setRoleFilter("");
    setAdminRoleFilter("");
    setRetentionFilter("");
    setAppealFilter("");
  }

  async function restoreUser(user: DeletedUser) {
    setBusyUserId(user.id);
    setError("");
    setNotice("");

    try {
      const response = await adminPost(apiRoutes.adminUserRestore(user.id));
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to restore account.");
      }

      setNotice(data.message ?? "Account restored.");
      await loadUsers();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to restore account.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <SuperAdminPageGuard>
      <AdminModuleShell
        description="Soft-deleted accounts stay stored here for 3 months. Users can appeal for restoration from login. Restore before the purge date, or the account is permanently deleted."
        title="Deleted Accounts"
      >
        {error ? <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div> : null}
        {notice ? <div className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">{notice}</div> : null}

        <AdminFilterBar>
          <AdminFilterField label="Search">
            <input
              className={adminInputClass()}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email, phone, reason..."
              value={search}
            />
          </AdminFilterField>
          <AdminFilterField label="Role">
            <select className={adminInputClass()} onChange={(event) => setRoleFilter(event.target.value)} value={roleFilter}>
              <option value="">All</option>
              <option value="admin">Admin</option>
              <option value="driver">Driver</option>
              <option value="passenger">Passenger</option>
            </select>
          </AdminFilterField>
          <AdminFilterField label="Admin Role">
            <select
              className={adminInputClass()}
              disabled={roleFilter !== "" && roleFilter !== "admin"}
              onChange={(event) => setAdminRoleFilter(event.target.value)}
              value={adminRoleFilter}
            >
              <option value="">All</option>
              <option value="operator">Operator</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </AdminFilterField>
          <AdminFilterField label="Appeal">
            <select
              className={adminInputClass()}
              onChange={(event) => setAppealFilter(event.target.value)}
              value={appealFilter}
            >
              <option value="">All</option>
              <option value="pending">Has restore appeal</option>
              <option value="none">No appeal yet</option>
            </select>
          </AdminFilterField>
          <AdminFilterField label="Retention">
            <select
              className={adminInputClass()}
              onChange={(event) => setRetentionFilter(event.target.value)}
              value={retentionFilter}
            >
              <option value="">All</option>
              <option value="expiring_soon">Expiring in 7 days</option>
              <option value="due">Due for purge</option>
            </select>
          </AdminFilterField>
          <div className="flex flex-wrap items-end gap-2 lg:ml-auto">
            <button
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-800 disabled:opacity-40"
              disabled={!hasActiveFilters}
              onClick={clearFilters}
              type="button"
            >
              Clear filters
            </button>
          </div>
        </AdminFilterBar>

        <p className="mt-4 text-sm font-semibold text-slate-600">
          {users.length} account{users.length === 1 ? "" : "s"}
          {hasActiveFilters ? " matching filters" : " in retention"}
        </p>

        <section className="mt-4 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Account</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Deleted</th>
                  <th className="px-5 py-3">Purge By</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">Restore Appeal</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length ? (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-5 py-4">
                        <div className="font-black">{user.name}</div>
                        <div className="text-slate-500">{user.email}</div>
                        <div className="mt-1 text-xs text-slate-400">{user.rides_count} rides on record</div>
                      </td>
                      <td className="px-5 py-4 capitalize">
                        {user.role}
                        {user.role === "admin" ? (
                          <span className="mt-1 block text-xs font-bold normal-case text-slate-500">
                            {formatAdminRoleLabel(user.admin_role)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{formatDateTime(user.deleted_at) || "—"}</td>
                      <td className="px-5 py-4 text-slate-600">
                        <div>{formatDateTime(user.purge_at) || "—"}</div>
                        <div className="mt-1 text-xs text-slate-400">{retentionLabel(user)}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <div>{user.deletion_reason || "—"}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          by {user.deleted_by_name || "—"}
                        </div>
                      </td>
                      <td className="max-w-xs px-5 py-4 text-slate-600">
                        {user.has_restore_appeal ? (
                          <div>
                            <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass("approved")}`}>
                              Appeal pending
                            </span>
                            <div className="mt-2 text-xs text-slate-400">
                              {formatDateTime(user.restore_appeal_submitted_at) || "—"}
                            </div>
                            <p className="mt-2 text-sm leading-5 text-slate-700">
                              {user.restore_appeal_message || "—"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">No appeal yet</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                          <button
                            className="shrink-0 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white disabled:bg-slate-300"
                            disabled={busyUserId === user.id}
                            onClick={() => void restoreUser(user)}
                            type="button"
                          >
                            {busyUserId === user.id ? "Restoring..." : "Restore"}
                          </button>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${statusClass("rejected")}`}
                          >
                            3-month hold
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-5 py-8 text-slate-500" colSpan={7}>
                      {hasActiveFilters
                        ? "No deleted accounts match these filters."
                        : "No deleted accounts in the 3-month retention window."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </AdminModuleShell>
    </SuperAdminPageGuard>
  );
}
