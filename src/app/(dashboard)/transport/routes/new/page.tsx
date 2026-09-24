import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { RouteForm } from "@/components/transport/route-form";

export default async function NewRoutePage() {
  await requireAdmin();
  const activities = await prisma.sightseeing.findMany({
    select: { id: true, name: true, city: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Add New Route</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Routes can then be priced against any vehicle in Manage Vehicle.
        </p>
      </div>
      <RouteForm mode="create" activityOptions={activities} />
    </div>
  );
}
