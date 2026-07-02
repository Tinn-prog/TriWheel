import { ShadowedStreetBackground } from "@/components/ShadowedStreetBackground";
import { TriWheelLogoMark } from "@/components/TriWheelLogo";

type TriWheelLoadingScreenProps = {
  compact?: boolean;
  message?: string;
  title?: string;
};

export function TriWheelLoadingScreen({
  compact = false,
  message = "Preparing your ride experience...",
  title = "Loading TriWheel",
}: TriWheelLoadingScreenProps) {
  return (
    <main
      className={
        compact
          ? "grid min-h-80 place-items-center rounded-3xl bg-gradient-to-br from-orange-50 via-white to-slate-50 p-6"
          : "relative grid min-h-screen place-items-center overflow-hidden bg-[var(--auth-bg)] px-6 py-10 text-white"
      }
    >
      {!compact ? <ShadowedStreetBackground priority /> : null}
      <section
        className={
          compact
            ? "w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-xl shadow-orange-100 ring-1 ring-orange-100"
            : "relative z-10 w-full max-w-lg rounded-[2rem] border border-white/20 bg-white/15 p-8 text-center shadow-2xl shadow-black/30 backdrop-blur-xl"
        }
      >
        <TriWheelLogoMark
          className={
            compact
              ? "mx-auto shadow-2xl shadow-orange-900/20"
              : "mx-auto shadow-2xl shadow-orange-950/30"
          }
          size={compact ? "2xl" : "3xl"}
        />

        <div className="mt-8 flex justify-center gap-2">
          {[0, 1, 2].map((item) => (
            <span
              className="size-3 animate-bounce rounded-full bg-orange-400"
              key={item}
              style={{ animationDelay: `${item * 140}ms` }}
              />
          ))}
        </div>

        <p
          className={
            compact
              ? "mt-6 text-xs font-black uppercase tracking-[0.28em] text-orange-600"
              : "mt-6 text-xs font-black uppercase tracking-[0.28em] text-orange-100"
          }
        >
          TriWheel
        </p>
        <h1
          className={
            compact
              ? "mt-3 text-2xl font-black text-slate-950"
              : "mt-3 text-4xl font-black text-white"
          }
        >
          {title}
        </h1>
        <p
          className={
            compact
              ? "mt-3 text-sm leading-6 text-slate-500"
              : "mt-3 text-sm leading-6 text-orange-50"
          }
        >
          {message}
        </p>

        <div
          className={
            compact
              ? "mt-8 h-2 overflow-hidden rounded-full bg-slate-100"
              : "mt-8 h-2 overflow-hidden rounded-full bg-white/20"
          }
        >
          <div className="h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-orange-400" />
        </div>
      </section>
    </main>
  );
}
