"use client";

import { adminDelete, adminGet, adminPatch, adminPost, apiRoutes, isSuperAdmin } from "@/lib/adminApi";
import { formatAdminRoleLabel } from "@/lib/adminRoles";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminFilterBar, AdminFilterField, adminInputClass, useDebouncedValue } from "../AdminFilters";
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
  const [createOpen, setCreateOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [adminRoleFilter, setAdminRoleFilter] = useState("");
  const [suspendedFilter, setSuspendedFilter] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    contact_number: "",
    role: "passenger",
    admin_role: "",
    is_verified: false,
  });
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    contact_number: "",
    password: "",
  });

  const loadUsers = useCallback(async () => {
    const response = await adminGet(apiRoutes.adminUsers, {
      role: roleFilter || undefined,
      admin_role: adminRoleFilter || undefined,
      suspended: suspendedFilter === "" ? undefined : suspendedFilter === "yes",
      search: debouncedSearch || undefined,
    });
    const data = (await response.json()) as { message?: string; users?: AdminUser[] };

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load users.");
    }

    setUsers(data.users ?? []);
  }, [adminRoleFilter, debouncedSearch, roleFilter, suspendedFilter]);

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

  async function createOperator() {
    setBusyUserId(-1);
    setError("");
    setNotice("");

    try {
      const response = await adminPost(apiRoutes.adminUsers, createForm);
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to create operator account.");
      }

      setNotice(data.message ?? "Admin operator account created.");
      setCreateOpen(false);
      setCreateForm({
        name: "",
        email: "",
        contact_number: "",
        password: "",
      });
      await loadUsers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to create operator account.",
      );
    } finally {
      setBusyUserId(null);
    }
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

  async function deleteUser(user: AdminUser, reason: string) {
    setBusyUserId(user.id);
    setError("");
    setNotice("");

    try {
      const response = await adminDelete(apiRoutes.adminUser(user.id), {
        deletion_reason: reason,
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to delete account.");
      }

      setNotice(data.message ?? "Account deleted and stored for 3 months.");
      setDeleteTarget(null);
      await loadUsers();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to delete account.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <SuperAdminPageGuard>
    <AdminModuleShell
      description="Super admins manage separate admin operator accounts. Operators cannot manage other admin accounts."
      title="User Accounts"
    >
      {error ? <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div> : null}
      {notice ? <div className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">{notice}</div> : null}

      {isSuperAdmin() ? (
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Link
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
            href="/superadmin/deleted-accounts"
          >
            View Deleted Accounts
          </Link>
          <button
            className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white"
            onClick={() => setCreateOpen(true)}
            type="button"
          >
            Create Operator Account
          </button>
        </div>
      ) : null}

      <AdminFilterBar>
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
        <AdminFilterField label="Suspended">
          <select
            className={adminInputClass()}
            onChange={(event) => setSuspendedFilter(event.target.value)}
            value={suspendedFilter}
          >
            <option value="">All</option>
            <option value="no">Active</option>
            <option value="yes">Suspended</option>
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
                  <td className="px-5 py-4 capitalize">
                    {user.role}
                    {user.role === "admin" ? (
                      <span className="mt-1 block text-xs font-bold normal-case text-slate-500">
                        {formatAdminRoleLabel(user.admin_role)}
                      </span>
                    ) : null}
                  </td>
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
                        <button
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700"
                          disabled={busyUserId === user.id}
                          onClick={() => setDeleteTarget(user)}
                          type="button"
                        >
                          Delete
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

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6">
            <h2 className="text-2xl font-black">Create Operator Account</h2>
            <p className="mt-2 text-sm text-slate-600">
              Super admins can create admin operator accounts for day-to-day operations.
            </p>
            <div className="mt-4 grid gap-3">
              <input
                className={adminInputClass()}
                onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Full name"
                value={createForm.name}
              />
              <input
                className={adminInputClass()}
                onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="Email"
                type="email"
                value={createForm.email}
              />
              <input
                className={adminInputClass()}
                onChange={(event) => setCreateForm((current) => ({ ...current, contact_number: event.target.value }))}
                placeholder="Contact number (optional)"
                value={createForm.contact_number}
              />
              <input
                className={adminInputClass()}
                minLength={6}
                onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Password (min 6 characters)"
                type="password"
                value={createForm.password}
              />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button className="rounded-2xl border px-4 py-2 font-black" onClick={() => setCreateOpen(false)} type="button">
                Cancel
              </button>
              <button
                className="rounded-2xl bg-orange-500 px-4 py-2 font-black text-white disabled:bg-slate-300"
                disabled={busyUserId === -1}
                onClick={() => void createOperator()}
                type="button"
              >
                {busyUserId === -1 ? "Creating..." : "Create Operator"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                  <option value="operator">Admin Operator (day-to-day operations)</option>
                  <option value="super_admin">Super Admin (full platform control)</option>
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

      <AdminRejectDialog
        confirmLabel="Delete & Store Account"
        description="This does not erase the account right away. It is soft-deleted and stored for 3 months. The user can log in and submit a restore appeal. If nobody restores it, it is permanently purged after that."
        isOpen={deleteTarget !== null}
        isSubmitting={busyUserId === deleteTarget?.id}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(reason) => {
          if (!deleteTarget) {
            return;
          }

          void deleteUser(deleteTarget, reason);
        }}
        title={deleteTarget?.name ?? "User"}
      />
    </AdminModuleShell>
    </SuperAdminPageGuard>
  );
}
