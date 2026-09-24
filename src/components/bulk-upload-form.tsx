"use client";

import { useActionState } from "react";
import { Download, Upload } from "lucide-react";
import type { ActionState } from "@/lib/actions/auth-actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";

export function BulkUploadForm({
  action,
  templateUrl,
  columnsHelp,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  templateUrl: string;
  columnsHelp: string;
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
          <p>
            Download a sample template, fill in your rows, then upload it below. {columnsHelp} Leave the{" "}
            <span className="font-medium text-foreground">ID</span> column blank to add new records — fill it in
            (from an earlier upload or export) to update an existing one instead.
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`${templateUrl}?format=xlsx`} download>
                <Download className="h-3.5 w-3.5" /> Sample Template (.xlsx)
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`${templateUrl}?format=csv`} download>
                <Download className="h-3.5 w-3.5" /> Sample Template (.csv)
              </a>
            </Button>
          </div>
        </div>

        <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="file">Upload file</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv,.xlsx,.xls"
              required
              className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium"
            />
          </div>
          <SubmitButton>
            <Upload className="h-3.5 w-3.5" /> Upload
          </SubmitButton>
        </form>

        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        {state?.success ? <p className="text-sm text-success">{state.success}</p> : null}
      </CardContent>
    </Card>
  );
}
