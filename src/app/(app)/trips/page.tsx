import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { TRIP_STATUS_LABEL, TRIP_STATUS_VARIANT } from "@/lib/labels";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus, Sparkles } from "lucide-react";

export default async function TripsPage() {
  const session = await requireSession();

  const trips = await prisma.trip.findMany({
    where: { agencyId: session.user.agencyId },
    include: { client: { select: { name: true } }, itinerary: { select: { id: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Trips</h1>
          <p className="text-sm text-slate-500">Bookings and itineraries in progress.</p>
        </div>
        <Link href="/trips/new" className={buttonVariants({ className: "flex items-center gap-1.5" })}>
          <Plus className="h-4 w-4" /> New trip
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Trip</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium">Budget</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Itinerary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trips.map((trip) => (
              <tr key={trip.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/trips/${trip.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {trip.title}
                  </Link>
                  <p className="text-xs text-slate-500">{trip.destination}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{trip.client.name}</td>
                <td className="px-4 py-3 text-slate-500">
                  {trip.startDate ? formatDate(trip.startDate) : "—"}
                  {trip.endDate ? ` – ${formatDate(trip.endDate)}` : ""}
                </td>
                <td className="px-4 py-3 text-slate-600">{formatCurrency(trip.budgetAmount?.toString(), trip.currency)}</td>
                <td className="px-4 py-3">
                  <Badge variant={TRIP_STATUS_VARIANT[trip.status]}>{TRIP_STATUS_LABEL[trip.status]}</Badge>
                </td>
                <td className="px-4 py-3">
                  {trip.itinerary ? (
                    <Badge variant="green">Ready</Badge>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Sparkles className="h-3.5 w-3.5" /> Not generated
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {trips.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                  No trips yet. Create one from a client&apos;s page or start here.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
