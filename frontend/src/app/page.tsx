import { ShadowedStreetBackground } from "@/components/ShadowedStreetBackground";
import { TriWheelLogo } from "@/components/TriWheelLogo";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const roles = [
    {
      name: "I'm a Passenger",
      description: "Book rides quickly and safely",
      href: "/login?role=passenger",
      badge: "Passenger",
      features: ["Quick booking", "Live tracking", "Reliable fares"],
    },
    {
      name: "I'm a Driver",
      description: "Earn money on your schedule",
      href: "/login?role=driver",
      badge: "Driver",
      features: ["Flexible hours", "Ride requests", "Good earnings"],
    },
  ];

  const features = [
    {
      icon: "GO",
      title: "Fast Booking",
      description: "Request a tricycle, pedicab, or e-tricycle ride in minutes.",
    },
    {
      icon: "OK",
      title: "Safe Rides",
      description: "Verified drivers and trip status updates keep every ride clear.",
    },
    {
      icon: "FARE",
      title: "Fair Pricing",
      description: "Transparent fare estimates help passengers and drivers agree fast.",
    },
    {
      icon: "MAP",
      title: "Local Focus",
      description: "Built for short community trips and everyday local travel.",
    },
  ];

  const steps = [
    {
      title: "Book a Ride",
      description: "Enter your pickup and drop-off locations.",
    },
    {
      title: "Choose Your Ride",
      description: "Select the ride type that fits your trip.",
    },
    {
      title: "Track and Ride",
      description: "Follow your ride status from request to arrival.",
    },
    {
      title: "Pay and Rate",
      description: "Complete the trip and share your feedback.",
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f9fafb] text-[#1a1d23]">
      <nav className="sticky top-0 z-20 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <TriWheelLogo href="/" size="lg" wordmarkClassName="text-lg sm:text-xl" />

          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a className="hover:text-orange-600" href="#features">
              Features
            </a>
            <a className="hover:text-orange-600" href="#how-it-works">
              How It Works
            </a>
            <a className="hover:text-orange-600" href="#about">
              About
            </a>
          </div>

          <Link
            className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 sm:px-5 sm:py-3"
            href="/login"
          >
            Login
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-[var(--auth-bg)] text-white">
        <ShadowedStreetBackground priority />
        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <p className="mb-5 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-orange-100 ring-1 ring-white/20 backdrop-blur-sm">
              Your local ride-hailing partner
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              Your Ride, <span className="text-orange-300">Your Way</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-orange-50/90 sm:mt-6 sm:text-lg sm:leading-8">
              Affordable, reliable, and convenient tricycle, pedicab, and
              e-tricycle rides at your fingertips.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <Link
                className="rounded-2xl bg-orange-500 px-7 py-4 text-center font-bold text-white shadow-xl shadow-black/30 transition hover:bg-orange-600"
                href="/signup"
              >
                Sign Up Free
              </Link>
              <a
                className="rounded-2xl border border-white/25 bg-white/10 px-7 py-4 text-center font-bold text-white shadow-sm backdrop-blur-sm transition hover:border-orange-200 hover:bg-white/15"
                href="#how-it-works"
              >
                How It Works
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white bg-white/80 p-3 shadow-2xl shadow-slate-200">
            <div className="overflow-hidden rounded-[1.65rem] bg-slate-950 p-5 text-white">
              <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-[1.25rem] bg-black">
                <Image
                  alt="TriWheel tricycle logo"
                  className="object-contain p-4"
                  fill
                  priority
                  sizes="(min-width: 1024px) 560px, 90vw"
                  src="/triwheel-brand-logo-v2.png"
                />
              </div>

              <p className="mt-6 text-sm font-bold uppercase tracking-[0.3em] text-orange-300">
                Select Your Role
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight">
                Continue as passenger or driver
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Choose the right login path for your TriWheel account.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {roles.map((role) => (
                  <Link
                    className="group flex min-h-48 flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.06] p-5 transition hover:-translate-y-1 hover:border-orange-300/70 hover:bg-white/[0.1]"
                    href={role.href}
                    key={role.name}
                  >
                    <div>
                      <span className="rounded-full bg-orange-400/15 px-3 py-1 text-xs font-bold text-orange-200">
                        {role.badge}
                      </span>
                      <h3 className="mt-5 text-2xl font-black">
                        {role.name}
                      </h3>
                      <p className="mt-2 text-sm text-slate-300">
                        {role.description}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {role.features.map((feature) => (
                        <span
                          className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200"
                          key={feature}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                    <span className="mt-6 inline-flex items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/25 transition group-hover:bg-orange-400">
                      Login as {role.badge}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-24" id="features">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-600">
                Why riders choose us
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                Built for everyday local trips
              </h2>
            </div>
            <p className="max-w-xl text-lg leading-8 text-slate-600">
              TriWheel focuses on simple booking, clear trip status, and rides
              that fit short community routes.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article
                className="group min-h-72 rounded-[2rem] border border-slate-100 bg-gradient-to-br from-white to-orange-50/50 p-8 shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl"
                key={feature.title}
              >
                <div className="grid size-16 place-items-center rounded-3xl bg-orange-500 text-sm font-black text-white shadow-lg shadow-orange-500/25 transition group-hover:scale-105">
                  {feature.icon}
                </div>
                <h3 className="mt-8 text-2xl font-black">{feature.title}</h3>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-y border-slate-200 bg-slate-50 py-24"
        id="how-it-works"
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-600">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
              From request to arrival in four steps
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Keep the ride flow easy to understand before users sign in.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <article
                className="relative overflow-hidden rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl"
                key={step.title}
              >
                <div className="absolute -right-8 -top-8 size-28 rounded-full bg-orange-100" />
                <div className="relative">
                  <div className="grid size-16 place-items-center rounded-3xl bg-slate-950 text-lg font-black text-white">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-8 text-2xl font-black">{step.title}</h3>
                  <p className="mt-4 text-base leading-7 text-slate-600">
                    {step.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 py-14 text-white" id="about">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
          <div>
            <TriWheelLogo size="lg" />
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
              Your reliable ride-hailing partner for local tricycle, pedicab,
              and e-tricycle trips.
            </p>
          </div>

          <div>
            <h3 className="font-black">Explore</h3>
            <div className="mt-4 grid gap-3 text-sm text-slate-400">
              <a className="hover:text-orange-300" href="#features">
                Features
              </a>
              <a className="hover:text-orange-300" href="#how-it-works">
                How It Works
              </a>
              <Link className="hover:text-orange-300" href="/signup">
                Sign Up
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-black">Account</h3>
            <div className="mt-4 grid gap-3 text-sm text-slate-400">
              <Link
                className="hover:text-orange-300"
                href="/login?role=passenger"
              >
                Passenger Login
              </Link>
              <Link className="hover:text-orange-300" href="/login?role=driver">
                Driver Login
              </Link>
              <a
                className="hover:text-orange-300"
                href="https://www.facebook.com/profile.php?id=61586455232006"
              >
                Facebook Page
              </a>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 px-6 pt-6">
          <p className="text-sm text-slate-500">
            Copyright 2026 TriWheel. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
