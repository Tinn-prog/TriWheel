import { ShadowedStreetBackground } from "@/components/ShadowedStreetBackground";
import { TriWheelLogo } from "@/components/TriWheelLogo";
import { portalFromLoginRole } from "@/lib/adminRoles";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams: Promise<{
    email?: string | string[];
    password?: string | string[];
    role?: string | string[];
    registered?: string | string[];
    verify?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const roleParam = Array.isArray(params.role) ? params.role[0] : params.role;
  const emailParam = Array.isArray(params.email) ? params.email[0] : params.email;
  const passwordParam = Array.isArray(params.password)
    ? params.password[0]
    : params.password;
  const registeredParam = Array.isArray(params.registered)
    ? params.registered[0]
    : params.registered;
  const verifyParam = Array.isArray(params.verify) ? params.verify[0] : params.verify;
  const adminPortal = portalFromLoginRole(roleParam);
  const selectedRole =
    roleParam === "driver"
      ? "driver"
      : adminPortal
        ? "admin"
        : "passenger";
  const isSuperAdminLogin = adminPortal === "superadmin";
  const roleLabel =
    selectedRole === "driver"
      ? "Driver"
      : isSuperAdminLogin
        ? "Super Admin"
        : selectedRole === "admin"
          ? "Admin Operator"
          : "Passenger";
  const alternateLogin =
    selectedRole === "driver"
      ? { href: "/login?role=passenger", label: "Login as Passenger" }
      : selectedRole === "passenger"
        ? { href: "/login?role=driver", label: "Login as Driver" }
        : isSuperAdminLogin
          ? { href: "/login?role=admin", label: "Login as Admin Operator" }
          : selectedRole === "admin"
            ? { href: "/login?role=superadmin", label: "Login as Super Admin" }
            : null;
  const registerHref =
    selectedRole === "driver" ? "/driver/register" : "/signup";
  const registerLabel =
    selectedRole === "driver" ? "Apply as Driver" : "Create an account";
  const registrationNotice =
    registeredParam === "1"
      ? verifyParam === "1"
        ? selectedRole === "driver"
          ? "Driver application submitted. Check your email and verify your address before logging in."
          : "Passenger account created. Check your email and verify your address before logging in."
        : selectedRole === "driver"
          ? "Driver application submitted successfully. Log in to check your application status."
          : "Passenger account created successfully. You can log in and book rides right away."
      : "";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--auth-bg)] px-4 py-6 text-white sm:px-6 sm:py-10">
      <ShadowedStreetBackground priority />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col sm:min-h-[calc(100vh-5rem)]">
        <Link
          className="mb-4 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-white/90 transition hover:text-white"
          href="/"
        >
          <span aria-hidden="true">←</span>
          Back to Home
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <div className="grid w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-black/40 ring-1 ring-white/10 lg:grid-cols-[0.9fr_1.1fr]">
            <section
              className={`p-5 text-white sm:p-12 ${
                isSuperAdminLogin
                  ? "bg-gradient-to-br from-red-800 via-red-900 to-[#1a0a0a]"
                  : "bg-gradient-to-br from-orange-700 via-orange-800 to-orange-950"
              }`}
            >
              <TriWheelLogo href="/" size="lg" wordmarkClassName="text-white" />

              <div className="mt-8 sm:mt-12">
                <p
                  className={`text-sm font-bold uppercase tracking-[0.3em] ${
                    isSuperAdminLogin ? "text-red-200/90" : "text-orange-200/90"
                  }`}
                >
                  Welcome back
                </p>
                <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                  {selectedRole === "driver"
                    ? "Sign in and start driving."
                    : isSuperAdminLogin
                      ? "Sign in to the super admin console."
                      : selectedRole === "admin"
                        ? "Sign in to the operations console."
                        : "Sign in and continue your ride."}
                </h1>
                <p className="mt-5 max-w-md text-orange-100/90">
                  {selectedRole === "driver"
                    ? "Access your driver dashboard, accept ride requests, and manage your trips."
                    : isSuperAdminLogin
                      ? "Manage platform settings, user roles, audit logs, and governance tools."
                      : selectedRole === "admin"
                        ? "Handle drivers, passengers, rides, reports, and emergency response."
                        : "Access your passenger dashboard, book rides, and check your trip status."}
                </p>
              </div>
            </section>

            <section className="bg-slate-50 p-5 text-slate-900 sm:p-10 lg:p-12">
              <h2 className="text-2xl font-bold sm:text-3xl">{roleLabel} Login</h2>

              {registrationNotice ? (
                <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                  {registrationNotice}
                  {verifyParam === "1" && emailParam ? (
                    <p className="mt-2 font-semibold">
                      <Link
                        className="text-emerald-800 underline"
                        href={`/verify-email?email=${encodeURIComponent(emailParam)}`}
                      >
                        Open email verification page
                      </Link>
                    </p>
                  ) : null}
                </div>
              ) : null}

              <LoginForm
                defaultEmail={emailParam ?? ""}
                defaultPassword={passwordParam ?? ""}
                portal={adminPortal ?? undefined}
              />

              <div className="mt-6 grid gap-4 text-center text-sm text-slate-700">
                {selectedRole === "passenger" || selectedRole === "driver" ? (
                  <p>
                    New to TriWheel?{" "}
                    <Link
                      className="font-bold text-orange-700 hover:text-orange-800"
                      href={registerHref}
                    >
                      {registerLabel}
                    </Link>
                  </p>
                ) : null}
                {alternateLogin ? (
                  <p>
                    <Link
                      className="font-bold text-slate-600 hover:text-orange-700"
                      href={alternateLogin.href}
                    >
                      {alternateLogin.label}
                    </Link>
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
