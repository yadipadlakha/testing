import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/permissions";
import { bulkUploadTransport } from "@/lib/actions/transport-actions";
import { BulkUploadForm } from "@/components/bulk-upload-form";
import { Button } from "@/components/ui/button";
import { TransportTabs } from "@/components/transport/transport-tabs";

export default async function TransportBulkUploadPage() {
  await requireAdmin();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Bulk Upload Transport</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add or update vehicles, routes, and route pricing at once from one spreadsheet.
          </p>
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
        action={bulkUploadTransport}
        templateUrl="/api/transport/template"
        helpText={
          "The template has three sheets: Vehicles, Routes, and Route Pricing — fill in whichever you need and " +
          "upload it back. Trip Types and Amenities accept comma-separated values. On the Route Pricing sheet, " +
          "reference a vehicle/route either by its exact Title/Name or by ID; leave a sheet's ID column blank to " +
          "add a new record, or fill it in to update an existing one. Route Pricing rows always upsert by " +
          "vehicle + route, since only one price applies per pair."
        }
      />
    </div>
  );
}
