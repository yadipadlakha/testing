import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { HotelForm } from "@/components/hotel/hotel-form";

export default async function EditHotelPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const hotel = await prisma.hotel.findUnique({ where: { id } });
  if (!hotel) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit Hotel</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update hotel details.</p>
      </div>
      <HotelForm
        mode="edit"
        hotelId={hotel.id}
        defaultValues={{
          name: hotel.name,
          destination: hotel.destination,
          starRating: hotel.starRating ?? "",
          address: hotel.address ?? "",
          contactPerson: hotel.contactPerson ?? "",
          contactPhone: hotel.contactPhone ?? "",
          contactEmail: hotel.contactEmail ?? "",
          pricePerNight: hotel.pricePerNight ?? "",
          notes: hotel.notes ?? "",
        }}
      />
    </div>
  );
}
