import { notFound } from "next/navigation";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { EnquiryForm } from "@/components/enquiry/enquiry-form";
import { toDateInputValue } from "@/lib/enquiry";

export default async function EditEnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModuleAccess("ENQUIRY");
  const { id } = await params;
  const isAdmin = session.user.role === "ADMIN";

  const [enquiry, employees] = await Promise.all([
    prisma.enquiry.findUnique({ where: { id }, include: { client: true } }),
    isAdmin
      ? prisma.user.findMany({ where: { role: "EMPLOYEE" }, select: { id: true, name: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  if (!enquiry) notFound();
  if (!isAdmin && enquiry.allocatedToId !== session.user.id) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit Enquiry</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update client and trip details.</p>
      </div>
      <EnquiryForm
        mode="edit"
        enquiryId={enquiry.id}
        isAdmin={isAdmin}
        employees={employees}
        defaultValues={{
          clientName: enquiry.client.name,
          clientPhone: enquiry.client.phone,
          clientEmail: enquiry.client.email ?? "",
          companyName: enquiry.client.companyName ?? "",
          clientCity: enquiry.client.city ?? "",
          clientState: enquiry.client.state ?? "",
          type: enquiry.type,
          travelTo: enquiry.travelTo,
          travelDate: toDateInputValue(enquiry.travelDate),
          durationDays: enquiry.durationDays,
          adults: enquiry.adults,
          children: enquiry.children,
          childrenAges: enquiry.childrenAges ?? "",
          hotelCategory: enquiry.hotelCategory ?? "",
          currency: enquiry.currency,
          notes: enquiry.notes ?? "",
          allocatedToId: enquiry.allocatedToId ?? "",
        }}
      />
    </div>
  );
}
