"use client";

import { adminPatch, adminGet, apiRoutes } from "@/lib/adminApi";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminFilterBar, AdminFilterField, adminInputClass, useDebouncedValue } from "../AdminFilters";
import { AdminModuleShell } from "../AdminModuleShell";
import { AdminRejectDialog } from "../AdminRejectDialog";

type ReportStatus = "pending" | "reviewed" | "dismissed";
type ReportSeverity = "critical" | "high" | "medium" | "low";

type RideReport = {
  id: number;
  ride_id: number;
  ride_status: string | null;
  ride_pickup: string | null;
  ride_dropoff: string | null;
  is_emergency: boolean;
  reporter_user_id: number;
  reported_user_id: number;
  reporter_role: string;
  reported_role: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  reporter_is_suspended: boolean;
  reported_name: string | null;
  reported_email: string | null;
  reported_is_suspended: boolean;
  report_reason_code: string;
  report_reason: string;
  severity: ReportSeverity;
  status: ReportStatus;
  admin_notes: string | null;
  ride_report_count: number;
  created_at: string;
};

type StatusFilter = "all" | ReportStatus;

type ReviewAction = {
  report: RideReport;
  status: ReportStatus;
};

type SuspendTarget = {
  userId: number;
  name: string;
};

const severityOrder: Record<ReportSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function reportStatusClass(status: ReportStatus) {
  if (status === "reviewed") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "dismissed") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-amber-100 text-amber-800";
}

function severityClass(severity: ReportSeverity) {
  if (severity === "critical") {
    return "bg-red-100 text-red-700";
  }

  if (severity === "high") {
    return "bg-orange-100 text-orange-700";
  }

  if (severity === "medium") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-slate-100 text-slate-600";
}

function profileHref(role: string | null) {
  if (role === "driver") {
    return "/admin/drivers";
  }

  if (role === "passenger") {
    return "/admin/passengers";
  }

  return "/admin/users";
}

function groupReportsByRide(reports: RideReport[]) {
  const groups = new Map<number, RideReport[]>();

  for (const report of reports) {
    const existing = groups.get(report.ride_id) ?? [];
    existing.push(report);
    groups.set(report.ride_id, existing);
  }

  return Array.from(groups.entries())
    .map(([rideId, rideReports]) => ({
      rideId,
      reports: rideReports.sort(
        (left, right) =>
          severityOrder[left.severity] - severityOrder[right.severity] ||
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      ),
    }))
    .sort((left, right) => {
      const leftSeverity = Math.min(
        ...left.reports.map((report) => severityOrder[report.severity]),
      );
      const rightSeverity = Math.min(
        ...right.reports.map((report) => severityOrder[report.severity]),
      );

      if (leftSeverity !== rightSeverity) {
        return leftSeverity - rightSeverity;
      }

      const leftPending = left.reports.some((report) => report.status === "pending");
      const rightPending = right.reports.some((report) => report.status === "pending");

      if (leftPending !== rightPending) {
        return leftPending ? -1 : 1;
      }

      return (
        new Date(right.reports[0]?.created_at ?? 0).getTime() -
        new Date(left.reports[0]?.created_at ?? 0).getTime()
      );
    });
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<RideReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [severityFilter, setSeverityFilter] = useState("");
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<SuspendTarget | null>(null);
  const [isSuspending, setIsSuspending] = useState(false);

  const loadReports = useCallback(async () => {
    const response = await adminGet(apiRoutes.adminReports, {
      status: statusFilter === "all" ? undefined : statusFilter,
      severity: severityFilter || undefined,
      emergency: emergencyOnly || undefined,
      search: debouncedSearch || undefined,
    });
    const data = (await response.json()) as {
      reports?: RideReport[];
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load reports.");
    }

    setReports(data.reports ?? []);
  }, [debouncedSearch, emergencyOnly, severityFilter, statusFilter]);

  useEffect(() => {
    async function load() {
      try {
        await loadReports();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load reports.",
        );
      }
    }

    void load();
  }, [loadReports]);

  const groupedReports = useMemo(() => groupReportsByRide(reports), [reports]);

  const pendingCount = useMemo(
    () => reports.filter((report) => report.status === "pending").length,
    [reports],
  );

  async function updateStatus(
    reportId: number,
    status: ReportStatus,
    adminNotes?: string,
  ) {
    setError("");
    setNotice("");
    setUpdatingId(reportId);

    try {
      const response = await adminPatch(apiRoutes.adminReport(reportId), {
        status,
        admin_notes: adminNotes?.trim() || null,
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to update report.");
      }

      setNotice(data.message ?? "Report updated.");
      setReviewAction(null);
      setReviewNotes("");
      await loadReports();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update report.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function suspendReportedUser(reason: string) {
    if (!suspendTarget) {
      return;
    }

    setError("");
    setNotice("");
    setIsSuspending(true);

    try {
      const response = await adminPatch(apiRoutes.adminUserSuspend(suspendTarget.userId), {
        is_suspended: true,
        suspension_reason: reason,
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to suspend user.");
      }

      setNotice(data.message ?? "User suspended successfully.");
      setSuspendTarget(null);
      await loadReports();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to suspend user.",
      );
    } finally {
      setIsSuspending(false);
    }
  }

  function openReviewAction(report: RideReport, status: ReportStatus) {
    setReviewAction({ report, status });
    setReviewNotes(report.admin_notes ?? "");
  }

  return (
    <AdminModuleShell
      description="Review safety reports by ride. Mutual reports on the same ride should be investigated together before taking action."
      title="Ride Reports"
    >
      {error ? (
        <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div>
      ) : null}
      {notice ? (
        <div className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">
          {notice}
        </div>
      ) : null}

      <AdminFilterBar>
        <AdminFilterField label="Search">
          <input
            className={adminInputClass()}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ride ID, reporter, reason..."
            value={search}
          />
        </AdminFilterField>
        <AdminFilterField label="Severity">
          <select
            className={adminInputClass()}
            onChange={(event) => setSeverityFilter(event.target.value)}
            value={severityFilter}
          >
            <option value="">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </AdminFilterField>
        <AdminFilterField label="Emergency">
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700">
            <input
              checked={emergencyOnly}
              className="size-4 accent-orange-600"
              onChange={(event) => setEmergencyOnly(event.target.checked)}
              type="checkbox"
            />
            Emergency rides only
          </label>
        </AdminFilterField>
      </AdminFilterBar>

      <section className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["pending", "Pending"],
            ["all", "All"],
            ["reviewed", "Reviewed"],
            ["dismissed", "Dismissed"],
          ] as const
        ).map(([value, label]) => (
          <button
            className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${
              statusFilter === value
                ? "bg-orange-500 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
            key={value}
            onClick={() => setStatusFilter(value)}
            type="button"
          >
            {label}
            {value === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </section>

      <section className="mt-6 grid gap-4">
        {groupedReports.length ? (
          groupedReports.map(({ rideId, reports: rideReports }) => {
            const lead = rideReports[0];
            const isMutual = rideReports.length > 1;
            const hasPending = rideReports.some((report) => report.status === "pending");
            const highestSeverity = rideReports.reduce<ReportSeverity>(
              (current, report) =>
                severityOrder[report.severity] < severityOrder[current]
                  ? report.severity
                  : current,
              "low",
            );

            return (
              <article
                className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200"
                key={rideId}
              >
                <header className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900">Ride #{rideId}</h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${severityClass(
                            highestSeverity,
                          )}`}
                        >
                          {highestSeverity}
                        </span>
                        {isMutual ? (
                          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase text-violet-700">
                            Mutual reports
                          </span>
                        ) : null}
                        {hasPending ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-800">
                            Needs review
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {lead.ride_pickup} → {lead.ride_dropoff}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {lead.ride_status ?? "unknown"}
                        {lead.is_emergency ? " · emergency ride" : ""} · {rideReports.length}{" "}
                        report{rideReports.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    {isMutual ? (
                      <p className="max-w-md rounded-2xl bg-violet-50 px-4 py-3 text-xs leading-5 text-violet-800">
                        Both sides reported each other on this ride. Review every report in this
                        group together before suspending or closing either case.
                      </p>
                    ) : null}
                  </div>
                </header>

                <div className="divide-y divide-slate-100">
                  {rideReports.map((report) => (
                    <div className="px-5 py-4" key={report.id}>
                      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr_auto] xl:items-start">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Reporter
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {report.reporter_name ?? "Unknown"}
                          </p>
                          <p className="text-xs text-slate-500">{report.reporter_email}</p>
                          <p className="mt-1 text-xs font-bold uppercase text-amber-700">
                            {report.reporter_role}
                            {report.reporter_is_suspended ? " · suspended" : ""}
                          </p>
                          <Link
                            className="mt-2 inline-flex text-xs font-black text-orange-600"
                            href={profileHref(report.reporter_role)}
                          >
                            View reporter profile →
                          </Link>
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Reported
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {report.reported_name ?? "Unknown"}
                          </p>
                          <p className="text-xs text-slate-500">{report.reported_email}</p>
                          <p className="mt-1 text-xs font-bold uppercase text-slate-600">
                            {report.reported_role ?? "user"}
                            {report.reported_is_suspended ? " · suspended" : ""}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-3">
                            <Link
                              className="inline-flex text-xs font-black text-orange-600"
                              href={profileHref(report.reported_role)}
                            >
                              View reported profile →
                            </Link>
                            {!report.reported_is_suspended ? (
                              <button
                                className="text-xs font-black text-red-600"
                                onClick={() =>
                                  setSuspendTarget({
                                    userId: report.reported_user_id,
                                    name: report.reported_name ?? "User",
                                  })
                                }
                                type="button"
                              >
                                Suspend reported user
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${severityClass(
                                report.severity,
                              )}`}
                            >
                              {report.severity}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${reportStatusClass(
                                report.status,
                              )}`}
                            >
                              {report.status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {report.report_reason}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {new Date(report.created_at).toLocaleString()}
                          </p>
                          {report.admin_notes ? (
                            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                              <span className="font-bold text-slate-500">Admin notes: </span>
                              {report.admin_notes}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-start gap-1.5 self-start xl:justify-end">
                          {report.status !== "reviewed" ? (
                            <button
                              className="inline-flex shrink-0 items-center rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50"
                              disabled={updatingId === report.id}
                              onClick={() => openReviewAction(report, "reviewed")}
                              type="button"
                            >
                              Reviewed
                            </button>
                          ) : null}
                          {report.status !== "dismissed" ? (
                            <button
                              className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 disabled:opacity-50"
                              disabled={updatingId === report.id}
                              onClick={() => openReviewAction(report, "dismissed")}
                              type="button"
                            >
                              Dismiss
                            </button>
                          ) : null}
                          {report.status !== "pending" ? (
                            <button
                              className="inline-flex shrink-0 items-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 disabled:opacity-50"
                              disabled={updatingId === report.id}
                              onClick={() => openReviewAction(report, "pending")}
                              type="button"
                            >
                              Reopen
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-bold text-slate-700">No ride reports in this view.</p>
            <p className="mt-1 text-sm text-slate-500">
              Switch filters to see reviewed or dismissed reports.
            </p>
          </div>
        )}
      </section>

      {reviewAction ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4">
          <div className="flex min-h-full items-center justify-center">
            <div
              className="flex max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-slate-200"
              role="dialog"
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
                  Update Report
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  {reviewAction.status === "reviewed"
                    ? "Mark as reviewed"
                    : reviewAction.status === "dismissed"
                      ? "Dismiss report"
                      : "Reopen report"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Ride #{reviewAction.report.ride_id} · {reviewAction.report.report_reason}
                </p>
                <label className="mt-5 grid gap-2 text-sm font-bold">
                  Admin notes
                  <textarea
                    className="min-h-32 rounded-2xl border border-slate-200 px-4 py-3 font-normal text-slate-900 outline-none ring-orange-500 focus:ring-2"
                    onChange={(event) => setReviewNotes(event.target.value)}
                    placeholder="What did you check? Why reviewed or dismissed? Any action taken?"
                    value={reviewNotes}
                  />
                </label>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-4">
                <button
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700"
                  disabled={updatingId === reviewAction.report.id}
                  onClick={() => {
                    setReviewAction(null);
                    setReviewNotes("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                  disabled={updatingId === reviewAction.report.id}
                  onClick={() =>
                    void updateStatus(
                      reviewAction.report.id,
                      reviewAction.status,
                      reviewNotes,
                    )
                  }
                  type="button"
                >
                  {updatingId === reviewAction.report.id ? "Saving..." : "Save decision"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <AdminRejectDialog
        confirmLabel="Suspend user"
        description="This will suspend the reported account and block them from using TriWheel until you unsuspend them."
        isOpen={suspendTarget !== null}
        isSubmitting={isSuspending}
        onClose={() => setSuspendTarget(null)}
        onConfirm={(reason) => void suspendReportedUser(reason)}
        title={suspendTarget ? `Suspend ${suspendTarget.name}` : "Suspend user"}
      />
    </AdminModuleShell>
  );
}
