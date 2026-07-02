import { TriWheelLogo } from "@/components/TriWheelLogo";
import Image from "next/image";
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
  const selectedRole =
    roleParam === "driver" ? "driver" : roleParam === "admin" ? "admin" : "passenger";
  const roleLabel =
    selectedRole === "driver"
      ? "Driver"
      : selectedRole === "admin"
        ? "Admin"
        : "Passenger";
  const alternateLogin =
    selectedRole === "driver"
      ? { href: "/login?role=passenger", label: "Login as Passenger" }
      : selectedRole !== "admin"
        ? { href: "/login?role=driver", label: "Login as Driver" }
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
    <main
      className="relative min-h-screen overflow-x-hidden px-4 py-6 text-white sm:px-6 sm:py-10"
      style={{ background: "var(--auth-bg)" }}
    >
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[min(82vw,820px)] -translate-x-1/2 -translate-y-1/2 opacity-10 blur-[1px] drop-shadow-[0_35px_90px_rgba(0,0,0,0.65)] object-contain"
        height={820}
        priority
        src="/triwheel-brand-logo-v2.png"
        width={820}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0)_40%,_rgba(0,0,0,0.55))]" />

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
          <section className="bg-gradient-to-br from-orange-700 via-orange-800 to-orange-950 p-5 text-white sm:p-12">
            <TriWheelLogo href="/" size="lg" wordmarkClassName="text-white" />

            <div className="mt-8 sm:mt-12">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-200/90">
                Welcome back
              </p>
              <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                {selectedRole === "driver"
                  ? "Sign in and start driving."
                  : selectedRole === "admin"
                    ? "Sign in to the admin dashboard."
                    : "Sign in and continue your ride."}
              </h1>
              <p className="mt-5 max-w-md text-orange-100/90">
                {selectedRole === "driver"
                  ? "Access your driver dashboard, accept ride requests, and manage your trips."
                  : selectedRole === "admin"
                    ? "Manage drivers, passengers, rides, and platform settings."
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
            />

            <div className="mt-6 grid gap-4 text-center text-sm text-slate-700">
              {selectedRole !== "admin" ? (
                <p>
                  New to TriWheel?{" "}
                  <Link className="font-bold text-orange-700 hover:text-orange-800" href={registerHref}>
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
