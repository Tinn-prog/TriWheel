import Link from "next/link";

type MigrationPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  source: string;
};

export function MigrationPlaceholder({
  eyebrow,
  title,
  description,
  source,
}: MigrationPlaceholderProps) {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-950">
      <section className="mx-auto max-w-4xl rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-600">
          {eyebrow}
        </p>
        <h1 className="mt-4 text-4xl font-black">{title}</h1>
        <p className="mt-4 max-w-2xl text-slate-600">{description}</p>
        <div className="mt-6 rounded-2xl bg-orange-50 p-4 text-sm font-bold text-orange-800">
          Legacy source: <span className="font-mono">{source}</span>
        </div>
        <Link
          className="mt-8 inline-flex rounded-2xl bg-orange-500 px-6 py-4 font-black text-white shadow-lg shadow-orange-500/25"
          href="/"
        >
          Back to Home
        </Link>
      </section>
    </main>
  );
}
