import { notFound } from "next/navigation";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { SalesPersonForm } from "@/components/sales-person/sales-person-form";

export default async function EditSalesPersonPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("ENQUIRY");
  const { id } = await params;

  const salesPerson = await prisma.salesPerson.findUnique({ where: { id } });
  if (!salesPerson) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit Sales Person</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update their contact details.</p>
      </div>
      <SalesPersonForm
        mode="edit"
        salesPersonId={salesPerson.id}
        defaultValues={{
          name: salesPerson.name,
          contactNumber: salesPerson.contactNumber,
          email: salesPerson.email ?? "",
          city: salesPerson.city ?? "",
          state: salesPerson.state ?? "",
          country: salesPerson.country ?? "",
        }}
      />
    </div>
  );
}
