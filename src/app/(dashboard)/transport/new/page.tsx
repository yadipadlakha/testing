import { requireAdmin } from "@/lib/permissions";
import { TransportForm } from "@/components/transport/transport-form";

export default async function NewTransportPage() {
  await requireAdmin();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Add Vehicle</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add a transport vendor to the catalog.</p>
      </div>
      <TransportForm mode="create" />
    </div>
  );
}
