import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/permissions";
import { bulkUploadSightseeing } from "@/lib/actions/sightseeing-actions";
import { BulkUploadForm } from "@/components/bulk-upload-form";
import { Button } from "@/components/ui/button";

export default async function SightseeingBulkUploadPage() {
  await requireAdmin();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Bulk Upload Activities</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add or update activities and their price calendar at once from one spreadsheet.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/sightseeing">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          <Button asChild>
            <Link href="/sightseeing/new">
              <Plus className="h-4 w-4" /> Add manually
            </Link>
          </Button>
        </div>
      </div>

      <BulkUploadForm
        action={bulkUploadSightseeing}
        templateUrl="/api/sightseeing/template"
        helpText={
          "The template has two sheets: Activities and Price Calendar — fill in whichever you need and upload " +
          "it back. Activity Types accepts comma-separated tag names — new tags are created automatically. On " +
          "the Price Calendar sheet, reference an activity either by its exact Activity Name or by ID; each row " +
          "there always adds a new rate band, matching how rate bands are added one at a time from the web app. " +
          "Leave the Activities sheet's ID column blank to add a new activity, or fill it in to update one."
        }
      />
    </div>
  );
}
