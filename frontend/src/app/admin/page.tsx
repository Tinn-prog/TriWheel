import { API_URL } from "@/lib/api";
import Link from "next/link";
import { AdminAccessGate } from "./AdminAccessGate";
import { AdminUserPanel } from "./AdminUserPanel";

type AdminOverview = {
  stats: {
    users: {
      total: number;
      admins: number;
      drivers: number;
      passengers: number;
    };
    drivers: {
      total: number;
      approved: number;
      pending: number;
      rejected: number;
      online: number;
      offline: number;
    };
    rides: {
      total: number;
      requested: number;
      ongoing: number;
      completed: number;
      cancelled: number;
      revenue: number;
    };
  };
  recent_users: Array<{
    id: number;
    name: string;
    email: string;
    contact_number: string | null;
    role: string;
    created_at: string;
  }>;
  drivers: Array<{
    id: number;
    name: string | null;
    email: string | null;
    contact_number: string | null;
    license_number: string | null;
    approval_status: string;
    status: string;
    vehicle_type: string | null;
    plate_number: string | null;
    color: string | null;
  }>;
};

const adminNavItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/drivers", label: "Driver Verification" },
  { href: "/admin/passengers", label: "Passenger Verification" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/rides", label: "Rides" },
  { href: "/admin/settings", label: "Settings" },
];

async function getAdminOverview(): Promise<AdminOverview> {
  const response = await fetch(`${API_URL}/admin/overview`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load admin dashboard.");
  }

  return response.json();
}

function statusClass(status: string) {
  if (status === "approved" || status === "completed") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "pending" || status === "requested" || status === "ongoing") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "rejected" || status === "cancelled") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

export default async function AdminDashboardPage() {
  const overview = await getAdminOverview();
  const statCards = [
    {
      label: "Total Users",
      value: overview.stats.users.total,
      detail: `${overview.stats.users.passengers} passengers, ${overview.stats.users.drivers} drivers`,
    },
    {
      label: "Total Rides",
      value: overview.stats.rides.total,
      detail: `${overview.stats.rides.completed} completed, ${overview.stats.rides.cancelled} cancelled`,
    },
    {
      label: "Revenue",
      value: `₱${overview.stats.rides.revenue.toLocaleString()}`,
      detail: "From completed rides",
    },
    {
      label: "Pending Drivers",
      value: overview.stats.drivers.pending,
      detail: `${overview.stats.drivers.approved} approved drivers`,
    },
  ];

  return (
    <AdminAccessGate>
    <main className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-slate-950 p-6 text-white lg:block">
        <Link className="text-2xl font-black" href="/">
          TriWheel
        </Link>
        <p className="mt-2 text-sm text-slate-400">Admin Control Center</p>

        <nav className="mt-10 grid gap-3 text-sm font-bold">
          {adminNavItems.map((item) => (
            <Link
              className="rounded-2xl px-4 py-3 text-slate-300 transition hover:bg-white/10 hover:text-white"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <AdminUserPanel />
        </div>
      </aside>

      <section className="w-full min-w-0 px-4 py-5 sm:px-6 sm:py-8 lg:ml-72 lg:w-auto">
        <header className="rounded-[1.75rem] bg-gradient-to-br from-orange-500 to-orange-700 p-5 text-white shadow-xl shadow-orange-200 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-100 sm:text-sm">
            Admin Dashboard
          </p>
          <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black leading-tight sm:text-4xl">
                TriWheel Operations
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-orange-50 sm:mt-3 sm:text-base">
                Monitor users, drivers, rides, verification requests, and core
                platform activity.
              </p>
            </div>
            <Link
              className="inline-flex w-fit rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-orange-700 sm:px-5 sm:py-3 sm:text-base"
              href="/"
            >
              Back to Home
            </Link>
          </div>
        </header>

        <div className="mt-6 lg:hidden">
          <AdminUserPanel />
        </div>

        <section
          className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          id="overview"
        >
          {statCards.map((card) => (
            <article
              className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              key={card.label}
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                {card.label}
              </p>
              <div className="mt-2 text-3xl font-black text-slate-950">
                {card.value}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {card.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid min-w-0 gap-6 xl:grid-cols-[1fr_0.9fr]">
          <article
            className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
            id="driver-verification"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Driver Verification</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Recent driver profiles and approval status.
                </p>
              </div>
              <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-black text-orange-700">
                {overview.stats.drivers.pending} pending
              </span>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="py-3">Driver</th>
                    <th className="py-3">Vehicle</th>
                    <th className="py-3">License</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Online</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.drivers.map((driver) => (
                    <tr key={driver.id}>
                      <td className="py-4">
                        <div className="font-black">{driver.name}</div>
                        <div className="text-slate-500">{driver.email}</div>
                      </td>
                      <td className="py-4 text-slate-600">
                        {driver.vehicle_type ?? "No vehicle"}{" "}
                        {driver.plate_number ? `• ${driver.plate_number}` : ""}
                      </td>
                      <td className="py-4 text-slate-600">
                        {driver.license_number ?? "-"}
                      </td>
                      <td className="py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(
                            driver.approval_status,
                          )}`}
                        >
                          {driver.approval_status}
                        </span>
                      </td>
                      <td className="py-4 text-slate-600">{driver.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-black">Ride Operations</h2>
            <p className="mt-1 text-sm text-slate-500">
              Current ride status summary.
            </p>
            <div className="mt-6 grid gap-3">
              {[
                ["Requested", overview.stats.rides.requested],
                ["Ongoing", overview.stats.rides.ongoing],
                ["Completed", overview.stats.rides.completed],
                ["Cancelled", overview.stats.rides.cancelled],
              ].map(([label, value]) => (
                <div
                  className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4"
                  key={label}
                >
                  <span className="font-bold text-slate-600">{label}</span>
                  <span className="text-2xl font-black">{value}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section
          className="mt-8 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200"
          id="users"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Recent Users</h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest registered accounts by role.
              </p>
            </div>
            <div className="hidden gap-2 text-sm font-black sm:flex">
              <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-700">
                {overview.stats.users.passengers} passengers
              </span>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">
                {overview.stats.users.drivers} drivers
              </span>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700">
                {overview.stats.users.admins} admins
              </span>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="py-3">Name</th>
                  <th className="py-3">Email</th>
                  <th className="py-3">Role</th>
                  <th className="py-3">Phone</th>
                  <th className="py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview.recent_users.map((user) => (
                  <tr key={user.id}>
                    <td className="py-4 font-black">{user.name}</td>
                    <td className="py-4 text-slate-600">{user.email}</td>
                    <td className="py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 text-slate-600">
                      {user.contact_number ?? "-"}
                    </td>
                    <td className="py-4 text-slate-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
    </AdminAccessGate>
  );
}
