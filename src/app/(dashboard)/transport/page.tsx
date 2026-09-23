import Link from "next/link";
import { Plus, Pencil, Trash2, MapPin, Users, Phone } from "lucide-react";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteTransport } from "@/lib/actions/transport-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export default async function TransportListPage() {
  const session = await requireModuleAccess("TRANSPORT");
  const isAdmin = session.user.role === "ADMIN";

  const vehicles = await prisma.transport.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Transport</h1>
          <p className="mt-1 text-sm text-muted-foreground">Catalog of vehicle vendors by destination.</p>
        </div>
        {isAdmin ? (
          <Button asChild>
            <Link href="/transport/new">
              <Plus className="h-4 w-4" /> Add Vehicle
            </Link>
          </Button>
        ) : null}
      </div>

      {vehicles.length === 0 ? (
        <Card className="items-center justify-center py-16 text-center text-sm text-muted-foreground">
          No vehicles added yet.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="gap-2 p-4">
              <p className="text-sm font-semibold text-foreground">{vehicle.vehicleType}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {vehicle.destination}
              </p>
              {vehicle.capacity ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> {vehicle.capacity} seats
                </p>
              ) : null}
              <p className="text-sm font-medium text-foreground">{formatCurrency(vehicle.pricePerDay)} / day</p>
              {vehicle.contactPerson || vehicle.contactPhone ? (
                <div className="text-xs text-muted-foreground">
                  {vehicle.contactPerson ? <p>{vehicle.contactPerson}</p> : null}
                  {vehicle.contactPhone ? (
                    <p className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {vehicle.contactPhone}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {isAdmin ? (
                <div className="mt-2 flex gap-1.5">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/transport/${vehicle.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                  </Button>
                  <form action={deleteTransport.bind(null, vehicle.id)}>
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
