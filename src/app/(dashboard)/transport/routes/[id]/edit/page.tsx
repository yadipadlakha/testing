import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { RouteForm } from "@/components/transport/route-form";

export default async function EditRoutePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [route, activities] = await Promise.all([
    prisma.transportRoute.findUnique({ where: { id }, include: { activities: true } }),
    prisma.sightseeing.findMany({ select: { id: true, name: true, city: true }, orderBy: { name: "asc" } }),
  ]);

  if (!route) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit Route</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update route details.</p>
      </div>
      <RouteForm
        mode="edit"
        routeId={route.id}
        activityOptions={activities}
        defaultValues={{
          name: route.name,
          destinations: route.destinations,
          itineraryText: route.itineraryText,
          actualDistanceKm: route.actualDistanceKm,
          displayDistanceKm: route.displayDistanceKm ?? "",
          itineraryDurationHours: route.itineraryDurationHours,
          activityIds: route.activities.map((a) => a.id),
        }}
      />
    </div>
  );
}
