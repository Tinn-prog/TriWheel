import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams: Promise<{
    role?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const roleParam = Array.isArray(params.role) ? params.role[0] : params.role;
  const selectedRole = roleParam === "driver" ? "driver" : "passenger";
  const roleLabel = selectedRole === "driver" ? "Driver" : "Passenger";
  const switchRole = selectedRole === "driver" ? "passenger" : "driver";
  const switchRoleLabel = selectedRole === "driver" ? "Passenger" : "Driver";
  const registerHref =
    selectedRole === "driver" ? "/driver/register" : "/signup";
  const registerLabel =
    selectedRole === "driver" ? "Apply as Driver" : "Create an account";
  const benefits =
    selectedRole === "driver"
      ? ["View ride requests", "Manage active trips", "Track your earnings"]
      : ["Book rides faster", "Track ride status", "View ride history"];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_#ffedd5_0%,_#fb923c_34%,_#7c2d12_68%,_#1c0f08_100%)] px-4 py-6 text-white sm:px-6 sm:py-10">
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-auto w-[min(82vw,820px)] -translate-x-1/2 -translate-y-1/2 opacity-10 blur-[1px] drop-shadow-[0_35px_90px_rgba(0,0,0,0.65)]"
        height={576}
        priority
        src="/triwheel-brand-logo-v2.png"
        width={1024}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(255,255,255,0.18),_rgba(255,255,255,0)_45%,_rgba(0,0,0,0.35))]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center sm:min-h-[calc(100vh-5rem)]">
        <div className="grid w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-orange-950/35 ring-1 ring-white/30 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 p-5 text-white sm:p-12">
            <Link className="inline-flex items-center gap-3" href="/">
              <span className="relative h-12 w-24 overflow-hidden rounded-2xl bg-black shadow-lg shadow-orange-700/20">
                <Image
                  alt="TriWheel logo"
                  className="object-contain p-1"
                  fill
                  priority
                  sizes="96px"
                  src="/triwheel-brand-logo-v2.png"
                />
              </span>
              <span className="text-2xl font-black">TriWheel</span>
            </Link>

            <div className="mt-8 sm:mt-16">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-orange-100">
                Welcome back
              </p>
              <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                {selectedRole === "driver"
                  ? "Sign in and start driving."
                  : "Sign in and continue your ride."}
              </h1>
              <p className="mt-5 max-w-md text-orange-50">
                {selectedRole === "driver"
                  ? "Access your driver dashboard, accept ride requests, and manage your trips."
                  : "Access your passenger dashboard, book rides, and check your trip status."}
              </p>

              <div className="mt-8 grid gap-3">
                {benefits.map((benefit) => (
                  <div
                    className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white"
                    key={benefit}
                  >
                    <span className="grid size-6 place-items-center rounded-full bg-white text-xs text-orange-600">
                      ✓
                    </span>
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="p-5 text-slate-950 sm:p-12">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex w-fit rounded-full bg-orange-100 px-4 py-2 text-sm font-black text-orange-700">
                {roleLabel} login path
              </div>
              <Link
                className="inline-flex w-fit rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
                href="/"
              >
                Back to Home
              </Link>
            </div>
            <h2 className="text-3xl font-black">{roleLabel} Login</h2>
            <p className="mt-2 text-slate-600">
              Enter your email and password. TriWheel will detect your real
              account role after login.
            </p>

            <LoginForm />

            <div className="mt-6 grid gap-3 text-center text-sm text-slate-600">
              <p>
                Need the other login?{" "}
                <Link
                  className="font-bold text-orange-600"
                  href={`/login?role=${switchRole}`}
                >
                  Login as {switchRoleLabel}
                </Link>
              </p>
              <p>
                New to TriWheel?{" "}
                <Link className="font-bold text-orange-600" href={registerHref}>
                  {registerLabel}
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
