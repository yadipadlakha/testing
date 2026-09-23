import Link from "next/link";
import { Plus, Mail } from "lucide-react";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/enquiry";

const MODULE_LABELS: Record<string, string> = {
  ENQUIRY: "Enquiry",
  HOTEL: "Hotel",
  SIGHTSEEING: "Sightseeing",
  TRANSPORT: "Transport",
};

export default async function EmployeesPage() {
  await requireAdmin();

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    include: { permissions: true, _count: { select: { allocatedEnquiries: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Employees</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create employee logins and control what they can see.</p>
        </div>
        <Button asChild>
          <Link href="/employees/new">
            <Plus className="h-4 w-4" /> Add Employee
          </Link>
        </Button>
      </div>

      {employees.length === 0 ? (
        <Card className="items-center justify-center py-16 text-center text-sm text-muted-foreground">
          No employees yet. Add your first employee to get started.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {employees.map((employee) => (
            <Link key={employee.id} href={`/employees/${employee.id}`}>
              <Card className="gap-2 p-4 transition-colors hover:bg-muted/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{employee.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> {employee.email}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {employee._count.allocatedEnquiries} enquir{employee._count.allocatedEnquiries === 1 ? "y" : "ies"} ·
                    Joined {formatDate(employee.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {employee.permissions.length === 0 ? (
                    <Badge variant="secondary">No modules assigned</Badge>
                  ) : (
                    employee.permissions.map((p) => (
                      <Badge key={p.module} variant="outline">
                        {MODULE_LABELS[p.module]}
                      </Badge>
                    ))
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
