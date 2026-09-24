import { notFound } from "next/navigation";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { QuotationForm } from "@/components/quotation/quotation-form";
import { toDateInputValue, formatEnquiryNumber, formatDate } from "@/lib/enquiry";
import { findRateForDate } from "@/lib/sightseeing";
import { buildTransportCatalog } from "@/lib/transport";

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
    prisma.sightseeing.findMany({ include: { rates: true }, orderBy: { name: "asc" } }),
    prisma.transport.findMany({
      include: { routePricing: { include: { route: true } } },
      orderBy: { title: "asc" },
    }),
  ]);

  const enquiry = quotation.enquiry;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit Quotation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          For {formatEnquiryNumber(enquiry.enquiryNumber)} — {enquiry.client.name}
        </p>
      </div>
      <QuotationForm
        mode="edit"
        quotationId={quotation.id}
        trip={{
          travelTo: enquiry.travelTo,
          travelDate: formatDate(enquiry.travelDate),
          travelDateIso: toDateInputValue(enquiry.travelDate),
          durationDays: enquiry.durationDays,
          adults: enquiry.adults,
          children: enquiry.children,
        }}
        defaultValues={{
          title: quotation.title,
          currency: quotation.currency,
          validUntil: toDateInputValue(quotation.validUntil),
          markupPercent: quotation.markupPercent,
          discount: quotation.discount,
          taxPercent: quotation.taxPercent,
          termsAndConditions: quotation.termsAndConditions ?? "",
          items: quotation.items.map((item) => ({
            id: item.id,
            category: item.category,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            details: item.details ?? undefined,
          })),
        }}
        catalog={{
          hotels: hotels.map((h) => ({
            id: h.id,
            name: h.name,
            destination: h.destination,
            address: h.address,
            currency: h.currency,
            pricePerNight: h.pricePerNight ?? 0,
          })),
          transport: buildTransportCatalog(transport, enquiry.durationDays),
          sightseeing: sightseeing.map((s) => {
            const rate = findRateForDate(s.rates, enquiry.travelDate);
            return {
              id: s.id,
              name: s.name,
              city: s.city,
              adultRate: rate?.adultRate ?? null,
              childRate: rate?.childRate ?? null,
              flatPrice: s.price ?? null,
            };
          }),
        }}
      />
    </div>
  );
}
