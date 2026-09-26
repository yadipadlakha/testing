import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { EnquiryForm } from "@/components/enquiry/enquiry-form";

export default async function NewEnquiryPage() {
  const session = await requireModuleAccess("ENQUIRY");
  const isAdmin = session.user.role === "ADMIN";

  const [employees, salesPersons] = await Promise.all([
    isAdmin
      ? prisma.user.findMany({
          where: { role: "EMPLOYEE" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.salesPerson.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Add New Enquiry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Client details are saved automatically and linked to this enquiry.
        </p>
      </div>
      <EnquiryForm mode="create" employees={employees} salesPersons={salesPersons} isAdmin={isAdmin} />
    </div>
  );
}
