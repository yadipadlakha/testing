import { notFound } from "next/navigation";
import { Mail, Calendar, Inbox } from "lucide-react";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { updateEmployeePermissions } from "@/lib/actions/employee-actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { ModuleCheckboxes } from "@/components/employees/module-checkboxes";
import { formatDate } from "@/lib/enquiry";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const employee = await prisma.user.findUnique({
    where: { id },
    include: { permissions: true, _count: { select: { allocatedEnquiries: true } } },
  });

  if (!employee || employee.role !== "EMPLOYEE") notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{employee.name}</h1>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" /> {employee.email}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Joined {formatDate(employee.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Inbox className="h-3.5 w-3.5" /> {employee._count.allocatedEnquiries} enquiries allocated
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module access</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateEmployeePermissions.bind(null, employee.id)} className="flex flex-col gap-4">
            <ModuleCheckboxes defaultChecked={employee.permissions.map((p) => p.module)} />
            <div className="flex justify-end">
              <SubmitButton>Save permissions</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
