import { requireModuleAccess } from "@/lib/permissions";
import { SalesPersonForm } from "@/components/sales-person/sales-person-form";

export default async function NewSalesPersonPage() {
  await requireModuleAccess("ENQUIRY");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Add Sales Person</h1>
        <p className="mt-1 text-sm text-muted-foreground">They&apos;ll be selectable from any enquiry once saved.</p>
      </div>
      <SalesPersonForm mode="create" />
    </div>
  );
}
