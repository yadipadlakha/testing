import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/permissions";
import { bulkUploadVehicles } from "@/lib/actions/transport-actions";
import { BulkUploadForm } from "@/components/bulk-upload-form";
import { Button } from "@/components/ui/button";
import { TransportTabs } from "@/components/transport/transport-tabs";

export default async function TransportBulkUploadPage() {
  await requireAdmin();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Bulk Upload Vehicles</h1>
          <p className="mt-1 text-sm text-muted-foreground">Add or update many vehicles at once from a spreadsheet.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/transport">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          <Button asChild>
            <Link href="/transport/new">
              <Plus className="h-4 w-4" /> Add manually
            </Link>
          </Button>
        </div>
      </div>

      <TransportTabs active="vehicles" />

      <BulkUploadForm
        action={bulkUploadVehicles}
        templateUrl="/api/transport/template"
        columnsHelp="Trip Types and Amenities accept comma-separated values (e.g. “Outstation, Airport”). This uploads vehicle details only; add route pricing from each vehicle's edit page afterward."
      />
    </div>
  );
}
