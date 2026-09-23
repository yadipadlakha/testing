import Link from "next/link";
import { Plus, Pencil, Trash2, MapPin, Phone, Mail, Star } from "lucide-react";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteHotel } from "@/lib/actions/hotel-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export default async function HotelListPage() {
  const session = await requireModuleAccess("HOTEL");
  const isAdmin = session.user.role === "ADMIN";

  const hotels = await prisma.hotel.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Hotels</h1>
          <p className="mt-1 text-sm text-muted-foreground">Catalog of hotel partners and their rates.</p>
        </div>
        {isAdmin ? (
          <Button asChild>
            <Link href="/hotel/new">
              <Plus className="h-4 w-4" /> Add Hotel
            </Link>
          </Button>
        ) : null}
      </div>

      {hotels.length === 0 ? (
        <Card className="items-center justify-center py-16 text-center text-sm text-muted-foreground">
          No hotels added yet.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hotels.map((hotel) => (
            <Card key={hotel.id} className="gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{hotel.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {hotel.destination}
                  </p>
                </div>
                {hotel.starRating ? (
                  <span className="flex items-center gap-0.5 text-xs font-medium text-amber-600">
                    {hotel.starRating}
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  </span>
                ) : null}
              </div>

              <p className="text-sm font-medium text-foreground">{formatCurrency(hotel.pricePerNight)} / night</p>

              {hotel.contactPerson || hotel.contactPhone ? (
                <div className="text-xs text-muted-foreground">
                  {hotel.contactPerson ? <p>{hotel.contactPerson}</p> : null}
                  {hotel.contactPhone ? (
                    <p className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {hotel.contactPhone}
                    </p>
                  ) : null}
                  {hotel.contactEmail ? (
                    <p className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {hotel.contactEmail}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {isAdmin ? (
                <div className="mt-2 flex gap-1.5">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/hotel/${hotel.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                  </Button>
                  <form action={deleteHotel.bind(null, hotel.id)}>
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
