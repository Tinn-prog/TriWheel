"use client";

import { adminGet, adminPatch, apiRoutes, isSuperAdmin } from "@/lib/adminApi";
import Link from "next/link";
import { useEffect, useState } from "react";
import { adminInputClass } from "../AdminFilters";
import { SuperAdminPageGuard } from "../SuperAdminPageGuard";
import { AdminModuleShell, statusClass } from "../AdminModuleShell";

type FareRules = {
  tricycle: { base: number; succeeding: number };
  pedicab: { base: number; succeeding: number };
  "e-tricycle": { base: number; succeeding: number };
};

type CorridorRule = {
  id: string;
  name: string;
  enabled: boolean;
  rules: Record<string, "block" | "warn" | "info">;
};

type RoadRestrictions = {
  enforce_corridors: boolean;
  enforce_zones: boolean;
  emergency_bypass: boolean;
  require_coordinates: boolean;
  corridors: CorridorRule[];
};

type SystemConfig = {
  platform_name: string;
  default_language: "en" | "fil";
  timezone: string;
  date_format: "en-PH" | "en-US" | "iso";
  currency_code: string;
  currency_symbol: string;
};

type AccessPolicy = {
  allow_passenger_registration: boolean;
  allow_driver_registration: boolean;
  require_driver_admin_approval: boolean;
  operators_can_suspend_users: boolean;
  operators_can_manage_reports: boolean;
  operators_can_approve_drivers: boolean;
};

type AdminAccount = {
  id: number;
  name: string;
  email: string;
  admin_role: string;
  is_suspended: boolean;
};

const TIMEZONE_OPTIONS = [
  "Asia/Manila",
  "Asia/Singapore",
  "Asia/Tokyo",
  "UTC",
];

export default function AdminSettingsPage() {
  const [fareRules, setFareRules] = useState<FareRules | null>(null);
  const [roadRestrictions, setRoadRestrictions] = useState<RoadRestrictions | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [accessPolicy, setAccessPolicy] = useState<AccessPolicy | null>(null);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSavingFare, setIsSavingFare] = useState(false);
  const [isSavingRoad, setIsSavingRoad] = useState(false);
  const [isSavingSystem, setIsSavingSystem] = useState(false);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await adminGet(apiRoutes.adminSettings);
        const data = (await response.json()) as {
          fare_rules?: FareRules;
          road_restrictions?: RoadRestrictions;
          system_config?: SystemConfig;
          access_policy?: AccessPolicy;
          admin_accounts?: AdminAccount[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(data.message ?? "Unable to load settings.");
        }

        setFareRules(data.fare_rules ?? null);
        setRoadRestrictions(data.road_restrictions ?? null);
        setSystemConfig(data.system_config ?? null);
        setAccessPolicy(data.access_policy ?? null);
        setAdminAccounts(data.admin_accounts ?? []);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load settings.");
      }
    }

    void load();
  }, []);

  async function saveFareRules() {
    if (!fareRules) {
      return;
    }

    setIsSavingFare(true);
    setError("");
    setNotice("");

    try {
      const response = await adminPatch(apiRoutes.adminSettings, { fare_rules: fareRules });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to save settings.");
      }

      setNotice(data.message ?? "Fare rules saved.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save settings.");
    } finally {
      setIsSavingFare(false);
    }
  }

  async function saveRoadRestrictions() {
    if (!roadRestrictions) {
      return;
    }

    setIsSavingRoad(true);
    setError("");
    setNotice("");

    try {
      const response = await adminPatch(apiRoutes.adminSettings, {
        road_restrictions: roadRestrictions,
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to save road restrictions.");
      }

      setNotice(data.message ?? "Road restrictions saved.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to save road restrictions.",
      );
    } finally {
      setIsSavingRoad(false);
    }
  }

  async function saveSystemConfig() {
    if (!systemConfig) {
      return;
    }

    setIsSavingSystem(true);
    setError("");
    setNotice("");

    try {
      const response = await adminPatch(apiRoutes.adminSettings, {
        system_config: systemConfig,
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to save system configuration.");
      }

      setNotice(data.message ?? "System configuration saved.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to save system configuration.",
      );
    } finally {
      setIsSavingSystem(false);
    }
  }

  async function saveAccessPolicy() {
    if (!accessPolicy) {
      return;
    }

    setIsSavingAccess(true);
    setError("");
    setNotice("");

    try {
      const response = await adminPatch(apiRoutes.adminSettings, {
        access_policy: accessPolicy,
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to save access policy.");
      }

      setNotice(data.message ?? "Access policy saved.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to save access policy.",
      );
    } finally {
      setIsSavingAccess(false);
    }
  }

  function toggleCorridor(corridorId: string, enabled: boolean) {
    setRoadRestrictions((current) =>
      current
        ? {
            ...current,
            corridors: current.corridors.map((corridor) =>
              corridor.id === corridorId ? { ...corridor, enabled } : corridor,
            ),
          }
        : current,
    );
  }

  function toggleAccessPolicy(key: keyof AccessPolicy, value: boolean) {
    setAccessPolicy((current) => (current ? { ...current, [key]: value } : current));
  }

  const canEdit = isSuperAdmin();

  return (
    <SuperAdminPageGuard>
    <AdminModuleShell
      description="Central control for platform configuration, user access, fares, and compliance."
      title="Admin Settings"
    >
      {error ? <div className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</div> : null}
      {notice ? <div className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">{notice}</div> : null}

      <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-2xl font-black">System Configuration</h2>
        <p className="mt-1 text-sm text-slate-500">
          Global platform defaults for language, timezone, and regional formats.
        </p>

        {systemConfig ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-1 text-xs font-bold text-slate-500">
              Platform name
              <input
                className={adminInputClass()}
                disabled={!canEdit}
                onChange={(event) =>
                  setSystemConfig((current) =>
                    current ? { ...current, platform_name: event.target.value } : current,
                  )
                }
                value={systemConfig.platform_name}
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-500">
              Default language
              <select
                className={adminInputClass()}
                disabled={!canEdit}
                onChange={(event) =>
                  setSystemConfig((current) =>
                    current
                      ? { ...current, default_language: event.target.value as SystemConfig["default_language"] }
                      : current,
                  )
                }
                value={systemConfig.default_language}
              >
                <option value="en">English</option>
                <option value="fil">Filipino</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-500">
              Timezone
              <select
                className={adminInputClass()}
                disabled={!canEdit}
                onChange={(event) =>
                  setSystemConfig((current) =>
                    current ? { ...current, timezone: event.target.value } : current,
                  )
                }
                value={systemConfig.timezone}
              >
                {TIMEZONE_OPTIONS.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-500">
              Date format
              <select
                className={adminInputClass()}
                disabled={!canEdit}
                onChange={(event) =>
                  setSystemConfig((current) =>
                    current
                      ? { ...current, date_format: event.target.value as SystemConfig["date_format"] }
                      : current,
                  )
                }
                value={systemConfig.date_format}
              >
                <option value="en-PH">Philippines (MM/DD/YYYY)</option>
                <option value="en-US">US (MM/DD/YYYY)</option>
                <option value="iso">ISO (YYYY-MM-DD)</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-500">
              Currency code
              <input
                className={adminInputClass()}
                disabled={!canEdit}
                onChange={(event) =>
                  setSystemConfig((current) =>
                    current ? { ...current, currency_code: event.target.value } : current,
                  )
                }
                value={systemConfig.currency_code}
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-500">
              Currency symbol
              <input
                className={adminInputClass()}
                disabled={!canEdit}
                onChange={(event) =>
                  setSystemConfig((current) =>
                    current ? { ...current, currency_symbol: event.target.value } : current,
                  )
                }
                value={systemConfig.currency_symbol}
              />
            </label>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Loading system configuration...</p>
        )}

        {canEdit ? (
          <button
            className="mt-6 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
            disabled={isSavingSystem || !systemConfig}
            onClick={() => void saveSystemConfig()}
            type="button"
          >
            {isSavingSystem ? "Saving..." : "Save System Configuration"}
          </button>
        ) : (
          <p className="mt-4 text-sm font-bold text-slate-500">
            Only super admins can edit system configuration.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">User Management &amp; Access Control</h2>
            <p className="mt-1 text-sm text-slate-500">
              Control registration, admin permissions, and role-based security.
            </p>
          </div>
          <Link
            className="inline-flex rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
            href="/superadmin/users"
          >
            Manage Users
          </Link>
        </div>

        {accessPolicy ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["allow_passenger_registration", "Allow new passenger sign-ups"],
                ["allow_driver_registration", "Allow new driver applications"],
                ["require_driver_admin_approval", "Require admin approval before drivers go online"],
                ["operators_can_suspend_users", "Operators can suspend passenger/driver accounts"],
                ["operators_can_manage_reports", "Operators can review ride reports"],
                ["operators_can_approve_drivers", "Operators can approve or reject drivers"],
              ] as const
            ).map(([key, label]) => (
              <label
                className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 p-4"
                key={key}
              >
                <input
                  checked={accessPolicy[key]}
                  className="mt-1 size-4 accent-orange-600"
                  disabled={!canEdit}
                  onChange={(event) => toggleAccessPolicy(key, event.target.checked)}
                  type="checkbox"
                />
                <span className="text-sm font-semibold text-slate-700">{label}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Loading access policy...</p>
        )}

        <div className="mt-8">
          <h3 className="text-lg font-black text-slate-900">Admin accounts</h3>
          <p className="mt-1 text-sm text-slate-500">
            Super admins can change roles in User Management. Operators have limited permissions
            based on the toggles above.
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminAccounts.length ? (
                  adminAccounts.map((account) => (
                    <tr key={account.id}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{account.name}</p>
                        <p className="text-xs text-slate-500">{account.email}</p>
                      </td>
                      <td className="px-4 py-3 capitalize">{account.admin_role.replace("_", " ")}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ${statusClass(
                            account.is_suspended ? "rejected" : "approved",
                          )}`}
                        >
                          {account.is_suspended ? "suspended" : "active"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500" colSpan={3}>
                      No admin accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {canEdit ? (
          <button
            className="mt-6 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
            disabled={isSavingAccess || !accessPolicy}
            onClick={() => void saveAccessPolicy()}
            type="button"
          >
            {isSavingAccess ? "Saving..." : "Save Access Policy"}
          </button>
        ) : (
          <p className="mt-4 text-sm font-bold text-slate-500">
            Only super admins can edit access policy.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-2xl font-black">Fare Rules</h2>
        <p className="mt-1 text-sm text-slate-500">
          Base fare covers the first kilometer. Succeeding rate applies per additional km.
        </p>

        {fareRules ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {Object.entries(fareRules).map(([rideType, rule]) => (
              <article className="rounded-2xl bg-slate-50 p-4" key={rideType}>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-orange-600">{rideType}</p>
                <label className="mt-3 grid gap-1 text-xs font-bold text-slate-500">
                  Base (PHP)
                  <input
                    className={adminInputClass()}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setFareRules((current) =>
                        current
                          ? {
                              ...current,
                              [rideType]: {
                                ...current[rideType as keyof FareRules],
                                base: Number(event.target.value),
                              },
                            }
                          : current,
                      )
                    }
                    type="number"
                    value={rule.base}
                  />
                </label>
                <label className="mt-3 grid gap-1 text-xs font-bold text-slate-500">
                  Succeeding / km (PHP)
                  <input
                    className={adminInputClass()}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setFareRules((current) =>
                        current
                          ? {
                              ...current,
                              [rideType]: {
                                ...current[rideType as keyof FareRules],
                                succeeding: Number(event.target.value),
                              },
                            }
                          : current,
                      )
                    }
                    type="number"
                    value={rule.succeeding}
                  />
                </label>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Loading fare rules...</p>
        )}

        {canEdit ? (
          <button
            className="mt-6 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
            disabled={isSavingFare || !fareRules}
            onClick={() => void saveFareRules()}
            type="button"
          >
            {isSavingFare ? "Saving..." : "Save Fare Rules"}
          </button>
        ) : (
          <p className="mt-4 text-sm font-bold text-slate-500">Only super admins can edit fare rules.</p>
        )}
      </section>

      <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-2xl font-black">Road &amp; LGU Compliance</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enforce Philippine-style restrictions on major corridors and LGU service zones.
        </p>

        {roadRestrictions ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["enforce_corridors", "Block or warn on restricted corridors (EDSA, C-5, etc.)"],
                  ["enforce_zones", "Require pickup/drop-off inside driver LGU service zones"],
                  ["emergency_bypass", "Allow emergency rides to bypass restrictions"],
                  ["require_coordinates", "Require map pins before booking"],
                ] as const
              ).map(([key, label]) => (
                <label
                  className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 p-4"
                  key={key}
                >
                  <input
                    checked={roadRestrictions[key]}
                    className="mt-1 size-4 accent-orange-600"
                    disabled={!canEdit}
                    onChange={(event) =>
                      setRoadRestrictions((current) =>
                        current ? { ...current, [key]: event.target.checked } : current,
                      )
                    }
                    type="checkbox"
                  />
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                </label>
              ))}
            </div>

            <h3 className="mt-8 text-lg font-black text-slate-900">Restricted corridors</h3>
            <div className="mt-4 grid gap-3">
              {roadRestrictions.corridors.map((corridor) => (
                <article
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={corridor.id}
                >
                  <div>
                    <p className="font-black text-slate-900">{corridor.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Tricycle: {corridor.rules.tricycle ?? "—"} · Pedicab:{" "}
                      {corridor.rules.pedicab ?? "—"} · E-trike:{" "}
                      {corridor.rules["e-tricycle"] ?? "—"}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <input
                      checked={corridor.enabled}
                      className="size-4 accent-orange-600"
                      disabled={!canEdit}
                      onChange={(event) => toggleCorridor(corridor.id, event.target.checked)}
                      type="checkbox"
                    />
                    Enabled
                  </label>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Loading road restrictions...</p>
        )}

        {canEdit ? (
          <button
            className="mt-6 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
            disabled={isSavingRoad || !roadRestrictions}
            onClick={() => void saveRoadRestrictions()}
            type="button"
          >
            {isSavingRoad ? "Saving..." : "Save Road Restrictions"}
          </button>
        ) : (
          <p className="mt-4 text-sm font-bold text-slate-500">
            Only super admins can edit road restrictions.
          </p>
        )}
      </section>
    </AdminModuleShell>
    </SuperAdminPageGuard>
  );
}
