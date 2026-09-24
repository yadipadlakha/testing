import { notFound } from "next/navigation";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { QuotationForm } from "@/components/quotation/quotation-form";
import { toDateInputValue, formatEnquiryNumber } from "@/lib/enquiry";

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModuleAccess("ENQUIRY");
  const { id } = await params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } }, enquiry: { include: { client: true } } },
  });
  if (!quotation) notFound();
  if (session.user.role !== "ADMIN" && quotation.enquiry.allocatedToId !== session.user.id) notFound();

  const [hotels, sightseeing, transport] = await Promise.all([
    prisma.hotel.findMany({ orderBy: { name: "asc" } }),
    prisma.sightseeing.findMany({ orderBy: { name: "asc" } }),
    prisma.transport.findMany({ orderBy: { vehicleType: "asc" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit Quotation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          For {formatEnquiryNumber(quotation.enquiry.enquiryNumber)} — {quotation.enquiry.client.name}
        </p>
      </div>
      <QuotationForm
        mode="edit"
        quotationId={quotation.id}
        defaultValues={{
          title: quotation.title,
          currency: quotation.currency,
          validUntil: toDateInputValue(quotation.validUntil),
          discount: quotation.discount,
          taxPercent: quotation.taxPercent,
          termsAndConditions: quotation.termsAndConditions ?? "",
          items: quotation.items.map((item) => ({
            id: item.id,
            category: item.category,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
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
