"use client";

import { adminGet, apiRoutes } from "@/lib/adminApi";
import { formatAuditAction, formatAuditDetailLines } from "@/lib/formatAuditDetails";
import { useEffect, useState } from "react";
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

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await adminGet(apiRoutes.adminAuditLogs);
        const data = (await response.json()) as { logs?: AuditLog[]; message?: string };

        if (!response.ok) {
          throw new Error(data.message ?? "Unable to load audit logs.");
        }

        setLogs(data.logs ?? []);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load audit logs.");
      }
    }

    void load();
  }, []);

  return (
    <AdminModuleShell
      description="Review admin actions across verification, rides, users, and settings."
      title="Audit Log"
    >
      {error ? <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div> : null}

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
              {logs.map((log) => (
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
                          return <span className="text-slate-400">ΓÇö</span>;
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
                      <span className="text-slate-400">ΓÇö</span>
                    )}
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
