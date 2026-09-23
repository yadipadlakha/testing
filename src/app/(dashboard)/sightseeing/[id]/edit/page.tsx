import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { SightseeingForm } from "@/components/sightseeing/sightseeing-form";

export default async function EditSightseeingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const activity = await prisma.sightseeing.findUnique({ where: { id } });
  if (!activity) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update activity details.</p>
      </div>
      <SightseeingForm
        mode="edit"
        sightseeingId={activity.id}
        defaultValues={{
          name: activity.name,
          destination: activity.destination,
          duration: activity.duration ?? "",
          price: activity.price ?? "",
          description: activity.description ?? "",
        }}
      />
    </div>
  );
}
