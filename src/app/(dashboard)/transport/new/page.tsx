import { requireAdmin } from "@/lib/permissions";
import { VehicleForm } from "@/components/transport/vehicle-form";

export default async function NewVehiclePage() {
  await requireAdmin();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Add Vehicle</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add a vehicle to the transport fleet.</p>
      </div>
      <VehicleForm mode="create" />
    </div>
  );
}
