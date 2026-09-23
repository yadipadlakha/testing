"use client";

import { useActionState } from "react";
import { createTransport, updateTransport } from "@/lib/actions/transport-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type TransportFormValues = {
  vehicleType?: string;
  destination?: string;
  capacity?: number | "";
  pricePerDay?: number | "";
  contactPerson?: string;
  contactPhone?: string;
  notes?: string;
};

export function TransportForm({
  mode,
  transportId,
  defaultValues,
}: {
  mode: "create" | "edit";
  transportId?: string;
  defaultValues?: TransportFormValues;
}) {
  const action = mode === "edit" && transportId ? updateTransport.bind(null, transportId) : createTransport;
  const [state, formAction] = useActionState(action, undefined);
  const v = defaultValues ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Vehicle details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vehicleType">Vehicle type</Label>
            <Input id="vehicleType" name="vehicleType" placeholder="e.g. Sedan, SUV, Tempo Traveller" defaultValue={v.vehicleType} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="destination">Destination</Label>
            <Input id="destination" name="destination" defaultValue={v.destination} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="capacity">Seating capacity</Label>
            <Input id="capacity" name="capacity" type="number" min={1} defaultValue={v.capacity} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pricePerDay">Price per day (₹)</Label>
            <Input id="pricePerDay" name="pricePerDay" type="number" min={0} defaultValue={v.pricePerDay} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactPerson">Contact person</Label>
            <Input id="contactPerson" name="contactPerson" defaultValue={v.contactPerson} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactPhone">Contact phone</Label>
            <Input id="contactPhone" name="contactPhone" defaultValue={v.contactPhone} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={v.notes} rows={4} />
          </div>
        </CardContent>
      </Card>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex justify-end">
        <SubmitButton>{mode === "edit" ? "Save changes" : "Add vehicle"}</SubmitButton>
      </div>
    </form>
  );
}
