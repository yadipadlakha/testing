import { notFound } from "next/navigation";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { QuotationForm } from "@/components/quotation/quotation-form";
import { formatEnquiryNumber, formatDate, toDateInputValue } from "@/lib/enquiry";

export default async function NewQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModuleAccess("ENQUIRY");
  const { id } = await params;

  const enquiry = await prisma.enquiry.findUnique({ where: { id }, include: { client: true } });
  if (!enquiry) notFound();
  if (session.user.role !== "ADMIN" && enquiry.allocatedToId !== session.user.id) notFound();

  const [hotels, sightseeing, transport, transportRoutes] = await Promise.all([
    prisma.hotel.findMany({ orderBy: { name: "asc" } }),
    prisma.sightseeing.findMany({ include: { rates: true }, orderBy: { name: "asc" } }),
    prisma.transport.findMany({
      include: { routePricing: true },
      orderBy: { title: "asc" },
    }),
    prisma.transportRoute.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">New Quotation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          For {formatEnquiryNumber(enquiry.enquiryNumber)} — {enquiry.client.name}
        </p>
      </div>
      <QuotationForm
        mode="create"
        enquiryId={enquiry.id}
        trip={{
          travelTo: enquiry.travelTo,
          travelDate: formatDate(enquiry.travelDate),
          travelDateIso: toDateInputValue(enquiry.travelDate),
          durationDays: enquiry.durationDays,
          adults: enquiry.adults,
          children: enquiry.children,
        }}
        defaultValues={{
          title: `Quotation for ${enquiry.travelTo}`,
          currency: enquiry.currency,
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
          activities: sightseeing.map((s) => ({
            id: s.id,
            name: s.name,
            city: s.city,
            flatPrice: s.price ?? null,
            rates: s.rates.map((r) => ({
              startDate: toDateInputValue(r.startDate),
              endDate: toDateInputValue(r.endDate),
              daysOfWeek: r.daysOfWeek,
              adultRate: r.adultRate ?? null,
              childRate: r.childRate ?? null,
              infantRate: r.infantRate ?? null,
            })),
          })),
          transportVehicles: transport.map((t) => ({
            id: t.id,
            title: t.title,
            vehicleType: t.vehicleType,
            subType: t.subType ?? "",
            acType: t.acType,
            seats: t.seats,
          })),
          transportRoutes: transportRoutes.map((r) => ({
            id: r.id,
            name: r.name,
            actualDistanceKm: r.actualDistanceKm,
          })),
          transportRoutePricing: transport.flatMap((t) =>
            t.routePricing.map((p) => ({
              vehicleId: t.id,
              routeId: p.routeId,
              pricePerKm: p.pricePerKm ?? null,
              nightCharge: p.nightCharge ?? null,
              tollTax: p.tollTax ?? null,
              driverAllowance: p.driverAllowance ?? null,
              totalPrice: p.totalPrice ?? null,
            })),
          ),
        }}
      />
    </div>
  );
}
