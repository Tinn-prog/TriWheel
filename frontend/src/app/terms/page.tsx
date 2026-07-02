import { ShadowedStreetBackground } from "@/components/ShadowedStreetBackground";
import Link from "next/link";import { TermsDocument } from "@/components/TermsAndConditions";

export default function TermsPage() {
  return (
    <main
      className="relative min-h-screen overflow-x-hidden bg-[var(--auth-bg)] px-4 py-6 text-white sm:px-6 sm:py-10"
    >
      <ShadowedStreetBackground />

      <div className="relative z-10 mx-auto w-full max-w-3xl">        <Link
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
