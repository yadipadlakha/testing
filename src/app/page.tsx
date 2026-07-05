import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  quoted: "bg-amber-100 text-amber-700",
  booked: "bg-emerald-100 text-emerald-700",
};

export default async function Home() {
  let itineraries: Awaited<
    ReturnType<typeof prisma.itinerary.findMany>
  > = [];
  let dbError = false;

  try {
    itineraries = await prisma.itinerary.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch {
    dbError = true;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Itineraries</h1>
          <p className="text-sm text-slate-500">
            AI-built trip plans for your clients.
          </p>
        </div>
        <Link
          href="/itineraries/new"
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          + New Itinerary
        </Link>
      </div>

      {dbError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Could not reach the database.</p>
          <p className="mt-1">
            Start Postgres with{" "}
            <code className="rounded bg-amber-100 px-1">docker compose up -d</code>{" "}
            and run{" "}
            <code className="rounded bg-amber-100 px-1">npm run db:push</code>.
          </p>
        </div>
      )}

      {!dbError && itineraries.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-slate-700">No itineraries yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Create your first AI-generated trip plan.
          </p>
          <Link
            href="/itineraries/new"
            className="mt-4 inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Build an itinerary
          </Link>
        </div>
      )}

      <div className="grid gap-3">
        {itineraries.map((it) => (
          <Link
            key={it.id}
            href={`/itineraries/${it.id}`}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-900">{it.title}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    statusStyles[it.status] ?? statusStyles.draft
                  }`}
                >
                  {it.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {it.destination} · {fmtDate(it.startDate)} –{" "}
                {fmtDate(it.endDate)} · {it.travelers} traveler
                {it.travelers === 1 ? "" : "s"}
              </p>
            </div>
            <span className="text-slate-300">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
