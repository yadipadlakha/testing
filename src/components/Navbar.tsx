import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-lg text-white">
            ✈
          </span>
          <span className="text-lg font-semibold text-slate-900">Voyage</span>
          <span className="hidden text-sm text-slate-400 sm:inline">
            AI Itinerary Builder
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/queries"
            className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100"
          >
            Queries
          </Link>
          <Link
            href="/quotes"
            className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100"
          >
            Quotes
          </Link>
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100"
          >
            Itineraries
          </Link>
          <Link
            href="/queries/new"
            className="ml-1 rounded-md bg-brand-500 px-3 py-1.5 font-medium text-white hover:bg-brand-600"
          >
            + New Query
          </Link>
        </nav>
      </div>
    </header>
  );
}
