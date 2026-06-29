import Image from "next/image";
import Link from "next/link";
import { TermsDocument } from "@/components/TermsAndConditions";

export default function TermsPage() {
  return (
    <main
      className="relative min-h-screen overflow-x-hidden px-4 py-6 text-white sm:px-6 sm:py-10"
      style={{ background: "var(--auth-bg)" }}
    >
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-auto w-[min(82vw,820px)] -translate-x-1/2 -translate-y-1/2 opacity-10 blur-[1px]"
        height={576}
        priority
        src="/triwheel-brand-logo-v2.png"
        width={1024}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0)_40%,_rgba(0,0,0,0.55))]" />

      <div className="relative z-10 mx-auto w-full max-w-3xl">
        <Link
          className="mb-4 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-white/90 transition hover:text-white"
          href="/"
        >
          <span aria-hidden="true">←</span>
          Back to Home
        </Link>

        <article className="rounded-[2rem] bg-white p-6 text-slate-900 shadow-2xl shadow-black/40 sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-600">
            Legal
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">
            Terms and Conditions
          </h1>
          <TermsDocument className="mt-8" />
        </article>
      </div>
    </main>
  );
}
