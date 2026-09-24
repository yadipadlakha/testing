import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { HotelImportForm } from "@/components/hotel/hotel-import-form";

export default async function HotelImportPage() {
  await requireAdmin();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Import Hotel Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a rate-sheet CSV to add rooms, meal plans, seasons, and rates in one go.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/hotel">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          <Button asChild>
            <Link href="/hotel/new">
              <Plus className="h-4 w-4" /> Add manually
            </Link>
          </Button>
        </div>
      </div>

      <HotelImportForm />
    </div>
  );
}
