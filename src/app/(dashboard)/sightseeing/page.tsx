import Link from "next/link";
import { Plus, Pencil, Trash2, MapPin, Clock } from "lucide-react";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteSightseeing } from "@/lib/actions/sightseeing-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export default async function SightseeingListPage() {
  const session = await requireModuleAccess("SIGHTSEEING");
  const isAdmin = session.user.role === "ADMIN";

  const activities = await prisma.sightseeing.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Sightseeing</h1>
          <p className="mt-1 text-sm text-muted-foreground">Catalog of activities and excursions by destination.</p>
        </div>
        {isAdmin ? (
          <Button asChild>
            <Link href="/sightseeing/new">
              <Plus className="h-4 w-4" /> Add Activity
            </Link>
          </Button>
        ) : null}
      </div>

      {activities.length === 0 ? (
        <Card className="items-center justify-center py-16 text-center text-sm text-muted-foreground">
          No activities added yet.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <Card key={activity.id} className="gap-2 p-4">
              <p className="text-sm font-semibold text-foreground">{activity.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {activity.destination}
              </p>
              {activity.duration ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {activity.duration}
                </p>
              ) : null}
              <p className="text-sm font-medium text-foreground">{formatCurrency(activity.price)} / person</p>
              {activity.description ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">{activity.description}</p>
              ) : null}

              {isAdmin ? (
                <div className="mt-2 flex gap-1.5">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/sightseeing/${activity.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                  </Button>
                  <form action={deleteSightseeing.bind(null, activity.id)}>
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
