import { ShadowedStreetBackground } from "@/components/ShadowedStreetBackground";
import { TriWheelLogo } from "@/components/TriWheelLogo";
import { type AdminPortal } from "@/lib/adminRoles";
import Link from "next/link";
import { LoginForm } from "@/app/login/LoginForm";

type StaffLoginScreenProps = {
  backHref?: string;
  defaultEmail?: string;
  defaultPassword?: string;
  portal: AdminPortal;
};

const portalCopy = {
  admin: {
    accent: "bg-gradient-to-br from-orange-700 via-orange-800 to-orange-950",
    badge: "text-orange-200/90",
    title: "Sign in to the operations console.",
    description:
      "Use your admin operator account to manage drivers, passengers, rides, reports, and emergency response.",
    heading: "Admin Operator Login",
    note: "This login is only for admin operator accounts.",
  },
  superadmin: {
    accent: "bg-gradient-to-br from-red-800 via-red-900 to-[#1a0a0a]",
    badge: "text-red-200/90",
    title: "Sign in to the super admin console.",
    description:
      "Use your super admin account for full platform control, settings, user roles, audit logs, and fixes.",
    heading: "Super Admin Login",
    note: "This login is only for super admin accounts.",
  },
} as const;

export function StaffLoginScreen({
  backHref = "/",
  defaultEmail = "",
  defaultPassword = "",
  portal,
}: StaffLoginScreenProps) {
  const copy = portalCopy[portal];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--auth-bg)] px-4 py-6 text-white sm:px-6 sm:py-10">
      <ShadowedStreetBackground priority />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col sm:min-h-[calc(100vh-5rem)]">
        <Link
          className="mb-4 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-white/90 transition hover:text-white"
          href={backHref}
        >
          <span aria-hidden="true">←</span>
          Back to Home
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <div className="grid w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-black/40 ring-1 ring-white/10 lg:grid-cols-[0.95fr_1.05fr]">
            <section className={`p-5 text-white sm:p-12 ${copy.accent}`}>
              <TriWheelLogo href="/" size="lg" wordmarkClassName="text-white" />

              <div className="mt-8 sm:mt-12">
                <p className={`text-sm font-bold uppercase tracking-[0.3em] ${copy.badge}`}>
                  Staff access
                </p>
                <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                  {copy.title}
                </h1>
                <p className="mt-5 max-w-md text-orange-100/90">{copy.description}</p>
              </div>
            </section>

            <section className="bg-slate-50 p-5 text-slate-900 sm:p-10 lg:p-12">
              <h2 className="text-2xl font-bold sm:text-3xl">{copy.heading}</h2>
              <p className="mt-3 text-sm font-semibold text-slate-600">{copy.note}</p>

              <LoginForm
                defaultEmail={defaultEmail}
                defaultPassword={defaultPassword}
                portal={portal}
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
