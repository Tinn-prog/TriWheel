"use client";

import { adminGet, apiRoutes } from "@/lib/adminApi";
import { formatAuditAction, formatAuditDetailLines } from "@/lib/formatAuditDetails";
import { useCallback, useEffect, useState } from "react";
import { AdminFilterBar, AdminFilterField, adminInputClass, useDebouncedValue } from "../AdminFilters";
import { AdminModuleShell } from "../AdminModuleShell";

type AuditLog = {
  id: number;
  admin_name: string | null;
  admin_email: string | null;
  admin_role: string | null;
  action: string;
  target_type: string;
  target_id: number;
  details: Record<string, unknown> | null;
  created_at: string;
};

const auditActions = [
  "driver.approved",
  "driver.rejected",
  "driver.suspended",
  "driver.activated",
  "driver.updated",
  "driver.compliance_updated",
  "passenger.verified",
  "passenger.unverified",
  "passenger.updated",
  "user.updated",
  "user.suspended",
  "user.unsuspended",
  "ride.cancelled",
  "ride.reassigned",
  "ride_report.updated",
  "settings.fare_rules_updated",
  "settings.road_restrictions_updated",
  "settings.system_config_updated",
  "settings.access_policy_updated",
] as const;

const targetTypes = ["user", "driver", "ride", "ride_report", "platform_setting"] as const;

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const loadLogs = useCallback(async () => {
    const response = await adminGet(apiRoutes.adminAuditLogs, {
      search: debouncedSearch || undefined,
      action: actionFilter || undefined,
      target_type: targetTypeFilter || undefined,
    });
    const data = (await response.json()) as { logs?: AuditLog[]; message?: string };

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load audit logs.");
    }

    setLogs(data.logs ?? []);
  }, [actionFilter, debouncedSearch, targetTypeFilter]);

  useEffect(() => {
    void loadLogs().catch((caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load audit logs.");
    });
  }, [loadLogs]);

  return (
    <AdminModuleShell
      description="Review admin actions across verification, rides, users, and settings."
      title="Audit Log"
    >
      {error ? <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div> : null}

      <AdminFilterBar>
        <AdminFilterField label="Search">
          <input
            className={adminInputClass()}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Admin, action, target ID..."
            value={search}
          />
        </AdminFilterField>
        <AdminFilterField label="Action">
          <select
            className={adminInputClass()}
            onChange={(event) => setActionFilter(event.target.value)}
            value={actionFilter}
          >
            <option value="">All actions</option>
            {auditActions.map((action) => (
              <option key={action} value={action}>
                {formatAuditAction(action)}
              </option>
            ))}
          </select>
        </AdminFilterField>
        <AdminFilterField label="Target Type">
          <select
            className={adminInputClass()}
            onChange={(event) => setTargetTypeFilter(event.target.value)}
            value={targetTypeFilter}
          >
            <option value="">All targets</option>
            {targetTypes.map((targetType) => (
              <option key={targetType} value={targetType}>
                {targetType.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </AdminFilterField>
      </AdminFilterBar>

      <section className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Admin</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Target</th>
                <th className="px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length ? (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-5 py-4 text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-black">{log.admin_name}</div>
                      <div className="text-slate-500">{log.admin_role ?? "admin"}</div>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700">
                      {formatAuditAction(log.action)}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {log.target_type} #{log.target_id}
                    </td>
                    <td className="max-w-sm px-5 py-4">
                      {log.details ? (
                        (() => {
                          const lines = formatAuditDetailLines(log.action, log.details);

                          if (!lines.length) {
                            return <span className="text-slate-400">—</span>;
                          }

                          return (
                            <ul className="space-y-1 text-xs leading-5 text-slate-600">
                              {lines.map((line) => (
                                <li key={`${line.label}-${line.value}`}>
                                  <span className="font-semibold text-slate-500">
                                    {line.label}:{" "}
                                  </span>
                                  <span className="break-words">{line.value}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        })()
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-500" colSpan={5}>
                    No audit entries match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminModuleShell>
  );
}
