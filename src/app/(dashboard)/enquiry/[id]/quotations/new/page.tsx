import { notFound } from "next/navigation";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { QuotationForm } from "@/components/quotation/quotation-form";
import { formatEnquiryNumber } from "@/lib/enquiry";

export default async function NewQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModuleAccess("ENQUIRY");
  const { id } = await params;

  const enquiry = await prisma.enquiry.findUnique({ where: { id }, include: { client: true } });
  if (!enquiry) notFound();
  if (session.user.role !== "ADMIN" && enquiry.allocatedToId !== session.user.id) notFound();

  const [hotels, sightseeing, transport] = await Promise.all([
    prisma.hotel.findMany({ orderBy: { name: "asc" } }),
    prisma.sightseeing.findMany({ orderBy: { name: "asc" } }),
    prisma.transport.findMany({ orderBy: { vehicleType: "asc" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">New Quotation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          For {formatEnquiryNumber(enquiry.enquiryNumber)} — {enquiry.client.name}
        </p>
      </div>
      <QuotationForm
        mode="create"
        enquiryId={enquiry.id}
        defaultValues={{
          title: `Quotation for ${enquiry.travelTo}`,
          currency: enquiry.currency,
        }}
        catalog={{
          hotels: hotels.map((h) => ({
            id: h.id,
            label: `${h.name} (${h.destination})`,
            unitPrice: h.pricePerNight ?? 0,
          })),
          sightseeing: sightseeing.map((s) => ({
            id: s.id,
            label: `${s.name} (${s.city})`,
            unitPrice: s.price ?? 0,
          })),
          transport: transport.map((t) => ({
            id: t.id,
            label: `${t.vehicleType} (${t.destination})`,
            unitPrice: t.pricePerDay ?? 0,
          })),
        }}
      />
    </div>
  );
}
