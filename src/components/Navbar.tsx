import Link from "next/link";
import Logo from "./Logo";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      {/* red → blue accent hairline */}
      <div className="h-1 bg-gradient-to-r from-accent-500 via-accent-500 to-brand-600" />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/queries"
            className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-brand-700"
          >
            Queries
          </Link>
          <Link
            href="/quotes"
            className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-brand-700"
          >
            Quotes
          </Link>
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-brand-700"
          >
            Itineraries
          </Link>
          <Link
            href="/reports"
            className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-brand-700"
          >
            Reports
          </Link>
          <Link
            href="/catalog"
            className="rounded-md px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-brand-700"
          >
            Rates
          </Link>
          <Link
            href="/queries/new"
            className="ml-1 rounded-md bg-accent-500 px-3.5 py-1.5 font-semibold text-white shadow-sm transition hover:bg-accent-600"
          >
            + New Query
          </Link>
        </nav>
      </div>
    </header>
  );
}
