import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { SightseeingForm } from "@/components/sightseeing/sightseeing-form";

export default async function NewSightseeingPage() {
  await requireAdmin();
  const allActivityTypes = await prisma.sightseeingActivityType.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Add Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a sightseeing activity to the catalog. You can set up its price calendar after saving.
        </p>
      </div>
      <SightseeingForm mode="create" allActivityTypes={allActivityTypes} selectedActivityTypeIds={[]} />
    </div>
  );
}
