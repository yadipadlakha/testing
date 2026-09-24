import Link from "next/link";
import { Plus, Upload, Pencil, Trash2, MapPin, Users, Snowflake } from "lucide-react";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteVehicle } from "@/lib/actions/transport-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TransportTabs } from "@/components/transport/transport-tabs";
import { tripTypeLabel } from "@/lib/transport";
import { formatCurrency } from "@/lib/format";

export default async function TransportListPage() {
  const session = await requireModuleAccess("TRANSPORT");
  const isAdmin = session.user.role === "ADMIN";

  const vehicles = await prisma.transport.findMany({
    include: { _count: { select: { routePricing: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Transport</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vehicle fleet and route pricing.</p>
        </div>
        {isAdmin ? (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/transport/bulk-upload">
                <Upload className="h-4 w-4" /> Bulk Upload
              </Link>
            </Button>
            <Button asChild>
              <Link href="/transport/new">
                <Plus className="h-4 w-4" /> Add Vehicle
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <TransportTabs active="vehicles" />

      {vehicles.length === 0 ? (
        <Card className="items-center justify-center py-16 text-center text-sm text-muted-foreground">
          No vehicles added yet.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{vehicle.title}</p>
                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Snowflake className="h-3 w-3" /> {vehicle.acType}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {vehicle.vehicleType}
                {vehicle.subType ? ` · ${vehicle.subType}` : ""}
              </p>
              {vehicle.location ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {vehicle.location}
                </p>
              ) : null}
              {vehicle.seats ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> {vehicle.seats} seats
                </p>
              ) : null}
              <div className="flex flex-wrap gap-1">
                {vehicle.tripTypes.map((t) => (
                  <Badge key={t} variant="outline">
                    {tripTypeLabel(t)}
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-foreground">
                {vehicle.pricePerKm ? `${formatCurrency(vehicle.pricePerKm)}/km` : ""}
                {vehicle.pricePerKm && vehicle.pricePerHour ? " · " : ""}
                {vehicle.pricePerHour ? `${formatCurrency(vehicle.pricePerHour)}/hr` : ""}
              </div>
              <p className="text-xs text-muted-foreground">
                {vehicle._count.routePricing} route{vehicle._count.routePricing === 1 ? "" : "s"} priced
              </p>

              {isAdmin ? (
                <div className="mt-2 flex gap-1.5">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/transport/${vehicle.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                  </Button>
                  <form action={deleteVehicle.bind(null, vehicle.id)}>
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
