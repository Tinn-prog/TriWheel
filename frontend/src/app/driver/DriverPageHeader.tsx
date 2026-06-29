import Link from "next/link";

export function DriverPageHeader({
  backHref = "/driver",
  description,
  eyebrow,
  title,
}: {
  backHref?: string;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="rounded-[1.75rem] bg-gradient-to-br from-orange-500 via-orange-600 to-orange-800 p-5 text-white shadow-xl shadow-orange-200 sm:p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-100 sm:text-sm">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-orange-50 sm:mt-3 sm:text-base">
            {description}
          </p>
        </div>
        {backHref ? (
          <Link
            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-black text-orange-700 shadow-sm transition hover:bg-orange-50 sm:text-sm"
            href={backHref}
          >
            Back to Dashboard
          </Link>
        ) : null}
      </div>
    </header>
  );
}
