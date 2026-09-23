import { requireAdmin } from "@/lib/permissions";
import { HotelForm } from "@/components/hotel/hotel-form";

export default async function NewHotelPage() {
  await requireAdmin();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Add Hotel</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add a hotel partner to the catalog.</p>
      </div>
      <HotelForm mode="create" />
    </div>
  );
}
