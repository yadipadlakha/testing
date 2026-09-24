import Link from "next/link";
import { Plus, Pencil, Trash2, Route as RouteIcon, Clock } from "lucide-react";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteRoute } from "@/lib/actions/transport-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TransportTabs } from "@/components/transport/transport-tabs";

export default async function TransportRoutesPage() {
  const session = await requireModuleAccess("TRANSPORT");
  const isAdmin = session.user.role === "ADMIN";

  const routes = await prisma.transportRoute.findMany({
    include: { _count: { select: { routePricing: true } }, activities: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Transport</h1>
          <p className="mt-1 text-sm text-muted-foreground">Routes available for vehicle pricing.</p>
        </div>
        {isAdmin ? (
          <Button asChild>
            <Link href="/transport/routes/new">
              <Plus className="h-4 w-4" /> Add Route
            </Link>
          </Button>
        ) : null}
      </div>

      <TransportTabs active="routes" />

      {routes.length === 0 ? (
        <Card className="items-center justify-center py-16 text-center text-sm text-muted-foreground">
          No routes added yet.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map((route) => (
            <Card key={route.id} className="gap-2 p-4">
              <p className="text-sm font-semibold text-foreground">{route.name}</p>
              <div className="flex flex-wrap gap-1">
                {route.destinations.map((d) => (
                  <Badge key={d} variant="outline">
                    {d}
                  </Badge>
                ))}
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <RouteIcon className="h-3 w-3" /> {route.actualDistanceKm} km
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {route.itineraryDurationHours} hrs
              </p>
              {route.activities.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {route.activities.length} attraction{route.activities.length === 1 ? "" : "s"} linked
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {route._count.routePricing} vehicle{route._count.routePricing === 1 ? "" : "s"} priced
              </p>

              {isAdmin ? (
                <div className="mt-2 flex gap-1.5">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/transport/routes/${route.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                  </Button>
                  <form action={deleteRoute.bind(null, route.id)}>
                    <Button variant="destructive" size="sm" type="submit">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
