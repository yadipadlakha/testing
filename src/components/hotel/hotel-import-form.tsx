"use client";

import { useActionState } from "react";
import { Info, Upload } from "lucide-react";
import { importHotelProperties } from "@/lib/actions/hotel-actions";
import { CURRENCIES } from "@/lib/enquiry";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";

export function HotelImportForm() {
  const [state, formAction] = useActionState(importHotelProperties, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Hotel Properties from CSV</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Instructions:</p>
            <p>
              Each property is a block starting with a{" "}
              <span className="font-mono text-xs">PROPERTY NAME | COUNTRY | X-STAR</span> header row, followed by a
              season reference table (season name + date range) and a room-rate matrix with one column per season.
              An optional <span className="font-mono text-xs">EXTRAS</span> section adds extra-bed / child rates.
              You can stack multiple properties in one file. Re-uploading a property with the same name replaces its
              existing seasons and rates.
            </p>
            <p className="mt-1">Accepted format: .csv</p>
          </div>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currency">Currency for all imported properties</Label>
            <Select id="currency" name="currency" defaultValue="" required className="max-w-xs">
              <option value="" disabled>
                -- Select Currency --
              </option>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">This currency will be applied to all prices in the CSV.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file">Choose CSV File</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv"
              required
              className="w-full max-w-md rounded-md border border-input bg-transparent px-3 py-1.5 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium"
            />
          </div>

          {state?.error ? <p className="text-sm whitespace-pre-line text-destructive">{state.error}</p> : null}
          {state?.success ? <p className="text-sm whitespace-pre-line text-success">{state.success}</p> : null}

          <div className="flex justify-start">
            <SubmitButton>
              <Upload className="h-3.5 w-3.5" /> Start Import
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
