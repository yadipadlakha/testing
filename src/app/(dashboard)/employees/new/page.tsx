import { requireAdmin } from "@/lib/permissions";
import { EmployeeForm } from "@/components/employees/employee-form";

export default async function NewEmployeePage() {
  await requireAdmin();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Add Employee</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a login and choose which modules this employee can access.
        </p>
      </div>
      <EmployeeForm />
    </div>
  );
}
