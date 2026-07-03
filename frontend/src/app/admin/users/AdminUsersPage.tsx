"use client";

import { adminGet, adminPatch, apiRoutes, isSuperAdmin } from "@/lib/adminApi";
import { useCallback, useEffect, useState } from "react";
import { AdminFilterBar, AdminFilterField, adminInputClass } from "../AdminFilters";
import { AdminModuleShell, statusClass } from "../AdminModuleShell";
import { SuperAdminPageGuard } from "../SuperAdminPageGuard";
import { AdminRejectDialog } from "../AdminRejectDialog";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  contact_number: string | null;
  role: string;
  admin_role: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  suspension_reason: string | null;
  rides_count: number;
  created_at: string;
};

export function AdminUsersPage() {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    contact_number: "",
    role: "passenger",
    admin_role: "",
    is_verified: false,
  });

  const loadUsers = useCallback(async () => {
    const response = await adminGet(apiRoutes.adminUsers, {
      role: roleFilter || undefined,
      search: search || undefined,
    });
    const data = (await response.json()) as { message?: string; users?: AdminUser[] };

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load users.");
    }

    setUsers(data.users ?? []);
  }, [roleFilter, search]);

  useEffect(() => {
    void loadUsers().catch((caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load users.");
    });
  }, [loadUsers]);

  function openEdit(user: AdminUser) {
    setEditTarget(user);
    setEditForm({
      name: user.name,
      email: user.email,
      contact_number: user.contact_number ?? "",
      role: user.role,
      admin_role: user.admin_role ?? "",
      is_verified: user.is_verified,
    });
  }

  async function saveUser() {
    if (!editTarget) {
      return;
    }

    setBusyUserId(editTarget.id);
    setError("");
    setNotice("");

    try {
      const response = await adminPatch(apiRoutes.adminUser(editTarget.id), {
        ...editForm,
        admin_role: editForm.role === "admin" ? editForm.admin_role || "operator" : null,
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to update user.");
      }

      setNotice(data.message ?? "User updated.");
      setEditTarget(null);
      await loadUsers();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update user.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function toggleSuspend(user: AdminUser, reason: string) {
    setBusyUserId(user.id);
    setError("");
    setNotice("");

    try {
      const response = await adminPatch(apiRoutes.adminUserSuspend(user.id), {
        is_suspended: !user.is_suspended,
        suspension_reason: user.is_suspended ? null : reason,
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to update suspension.");
      }

      setNotice(data.message ?? "Suspension updated.");
      setSuspendTarget(null);
      await loadUsers();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update suspension.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <SuperAdminPageGuard>
    <AdminModuleShell description="Review, edit, and suspend platform accounts." title="User Management">
      {error ? <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div> : null}
      {notice ? <div className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">{notice}</div> : null}

      <AdminFilterBar>
        <AdminFilterField label="Role">
          <select className={adminInputClass()} onChange={(event) => setRoleFilter(event.target.value)} value={roleFilter}>
            <option value="">All</option>
            <option value="admin">Admin</option>
            <option value="driver">Driver</option>
            <option value="passenger">Passenger</option>
          </select>
        </AdminFilterField>
        <AdminFilterField label="Search">
          <input className={adminInputClass()} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, phone..." value={search} />
        </AdminFilterField>
      </AdminFilterBar>

      <section className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Verified</th>
                <th className="px-5 py-3">Suspended</th>
                <th className="px-5 py-3">Rides</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-4">
                    <div className="font-black">{user.name}</div>
                    <div className="text-slate-500">{user.email}</div>
                  </td>
                  <td className="px-5 py-4 capitalize">{user.role} {user.admin_role ? `(${user.admin_role})` : ""}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${user.is_verified ? statusClass("verified") : statusClass("unverified")}`}>
                      {user.is_verified ? "yes" : "no"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${user.is_suspended ? statusClass("rejected") : statusClass("approved")}`}>
                      {user.is_suspended ? "yes" : "no"}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-black">{user.rides_count}</td>
                  <td className="px-5 py-4">
                    {isSuperAdmin() ? (
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-black text-white" onClick={() => openEdit(user)} type="button">Edit</button>
                        <button
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black"
                          disabled={busyUserId === user.id}
                          onClick={() => user.is_suspended ? void toggleSuspend(user, "") : setSuspendTarget(user)}
                          type="button"
                        >
                          {user.is_suspended ? "Unsuspend" : "Suspend"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Super admin only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6">
            <h2 className="text-2xl font-black">Edit User</h2>
            <div className="mt-4 grid gap-3">
              {(["name", "email", "contact_number"] as const).map((field) => (
                <input
                  className={adminInputClass()}
                  key={field}
                  onChange={(event) => setEditForm((current) => ({ ...current, [field]: event.target.value }))}
                  placeholder={field}
                  value={editForm[field]}
                />
              ))}
              <select className={adminInputClass()} onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))} value={editForm.role}>
                <option value="passenger">Passenger</option>
                <option value="driver">Driver</option>
                <option value="admin">Admin</option>
              </select>
              {editForm.role === "admin" ? (
                <select className={adminInputClass()} onChange={(event) => setEditForm((current) => ({ ...current, admin_role: event.target.value }))} value={editForm.admin_role}>
                  <option value="operator">Operator</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button className="rounded-2xl border px-4 py-2 font-black" onClick={() => setEditTarget(null)} type="button">Cancel</button>
              <button className="rounded-2xl bg-orange-500 px-4 py-2 font-black text-white" disabled={busyUserId === editTarget.id} onClick={() => void saveUser()} type="button">Save</button>
            </div>
          </div>
        </div>
      ) : null}

      <AdminRejectDialog
        confirmLabel="Suspend User"
        description="Provide a suspension reason. The user will be blocked from logging in."
        isOpen={suspendTarget !== null}
        isSubmitting={busyUserId === suspendTarget?.id}
        onClose={() => setSuspendTarget(null)}
        onConfirm={(reason) => {
          if (!suspendTarget) {
            return;
          }

          void toggleSuspend(suspendTarget, reason);
        }}
        title={suspendTarget?.name ?? "User"}
      />
    </AdminModuleShell>
    </SuperAdminPageGuard>
  );
}
