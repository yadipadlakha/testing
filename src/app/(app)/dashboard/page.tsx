import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { SimpleBarChart } from "@/components/charts/bar-chart";
import { LEAD_STAGES, LEAD_STAGE_LABEL, TRIP_STATUSES, TRIP_STATUS_LABEL, TRIP_STATUS_VARIANT } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Users, Briefcase, DollarSign, CalendarClock } from "lucide-react";

export default async function DashboardPage() {
  const session = await requireSession();
  const agencyId = session.user.agencyId;

  const [clientCount, activeTripsCount, pipelineValue, upcomingTrips, clientsByStage, tripsByStatus] =
    await Promise.all([
      prisma.client.count({ where: { agencyId } }),
      prisma.trip.count({ where: { agencyId, status: { in: ["CONFIRMED", "IN_PROGRESS"] } } }),
      prisma.trip.aggregate({
        where: { agencyId, status: { notIn: ["CANCELLED", "COMPLETED"] } },
        _sum: { budgetAmount: true },
      }),
      prisma.trip.findMany({
        where: { agencyId, startDate: { gte: new Date() }, status: { not: "CANCELLED" } },
        orderBy: { startDate: "asc" },
        take: 5,
        include: { client: { select: { name: true } } },
      }),
      prisma.client.groupBy({ by: ["stage"], where: { agencyId }, _count: { _all: true } }),
      prisma.trip.groupBy({ by: ["status"], where: { agencyId }, _count: { _all: true } }),
    ]);

  const stageCounts = Object.fromEntries(clientsByStage.map((row) => [row.stage, row._count._all]));
  const statusCounts = Object.fromEntries(tripsByStatus.map((row) => [row.status, row._count._all]));

  const pipelineData = LEAD_STAGES.map((stage) => ({
    label: LEAD_STAGE_LABEL[stage],
    value: stageCounts[stage] ?? 0,
  }));

  const tripStatusData = TRIP_STATUSES.map((status) => ({
    label: TRIP_STATUS_LABEL[status],
    value: statusCounts[status] ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of your agency&apos;s pipeline and bookings.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total clients" value={String(clientCount)} icon={Users} accent="indigo" />
        <StatCard label="Active bookings" value={String(activeTripsCount)} icon={Briefcase} accent="blue" />
        <StatCard
          label="Active pipeline value"
          value={formatCurrency(pipelineValue._sum.budgetAmount?.toString() ?? 0)}
          icon={DollarSign}
          accent="emerald"
        />
        <StatCard label="Upcoming trips" value={String(upcomingTrips.length)} icon={CalendarClock} accent="amber" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by stage</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={pipelineData} color="#4f46e5" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Trips by status</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={tripStatusData} color="#0ea5e9" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming trips</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingTrips.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming trips scheduled.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100">
              {upcomingTrips.map((trip) => (
                <li key={trip.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link href={`/trips/${trip.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {trip.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {trip.client.name} · {trip.destination} · {formatDate(trip.startDate)}
                    </p>
                  </div>
                  <Badge variant={TRIP_STATUS_VARIANT[trip.status]}>{TRIP_STATUS_LABEL[trip.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
