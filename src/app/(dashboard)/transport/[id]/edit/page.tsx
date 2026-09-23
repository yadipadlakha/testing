import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { TransportForm } from "@/components/transport/transport-form";

export default async function EditTransportPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const vehicle = await prisma.transport.findUnique({ where: { id } });
  if (!vehicle) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit Vehicle</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update vehicle details.</p>
      </div>
      <TransportForm
        mode="edit"
        transportId={vehicle.id}
        defaultValues={{
          vehicleType: vehicle.vehicleType,
          destination: vehicle.destination,
          capacity: vehicle.capacity ?? "",
          pricePerDay: vehicle.pricePerDay ?? "",
          contactPerson: vehicle.contactPerson ?? "",
          contactPhone: vehicle.contactPhone ?? "",
          notes: vehicle.notes ?? "",
        }}
      />
    </div>
  );
}
