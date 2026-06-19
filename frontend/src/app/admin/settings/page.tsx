import { AdminModuleShell } from "../AdminModuleShell";

export default function AdminSettingsPage() {
  const settings = [
    {
      detail: "PHP 35 minimum for the first kilometer, then PHP 14 per succeeding kilometer.",
      label: "Fare Rule",
    },
    {
      detail: "Drivers submit identity, license, TODA, emergency contact, vehicle photo, OR/CR, and consent requirements before admin approval.",
      label: "Driver Approval",
    },
    {
      detail: "Passengers request rides, drivers send offers, and passengers choose the driver.",
      label: "Ride Matching",
    },
    {
      detail: "Use Vercel for Next.js and Laravel Cloud or another Laravel host for the API.",
      label: "Deployment Target",
    },
  ];

  const readiness = [
    "Confirm production API URL in frontend environment variables.",
    "Set Laravel APP_KEY, database credentials, and CORS origins.",
    "Run migrations and seed demo admin, passenger, and driver accounts.",
    "Verify maps, fare calculation, login, and full ride flow on production.",
  ];

  return (
    <AdminModuleShell
      description="Review important platform rules and deployment readiness items."
      title="Admin Settings"
    >
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {settings.map((setting) => (
          <article
            className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200"
            key={setting.label}
          >
            <p className="text-sm font-black uppercase tracking-[0.18em] text-orange-600">
              {setting.label}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {setting.detail}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-2xl font-black">Deployment Readiness</h2>
        <div className="mt-5 grid gap-3">
          {readiness.map((item) => (
            <div
              className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600"
              key={item}
            >
              {item}
            </div>
          ))}
        </div>
      </section>
    </AdminModuleShell>
  );
}
