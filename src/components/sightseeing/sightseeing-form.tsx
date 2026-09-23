"use client";

import { useActionState } from "react";
import { createSightseeing, updateSightseeing } from "@/lib/actions/sightseeing-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type SightseeingFormValues = {
  name?: string;
  destination?: string;
  duration?: string;
  price?: number | "";
  description?: string;
};

export function SightseeingForm({
  mode,
  sightseeingId,
  defaultValues,
}: {
  mode: "create" | "edit";
  sightseeingId?: string;
  defaultValues?: SightseeingFormValues;
}) {
  const action = mode === "edit" && sightseeingId ? updateSightseeing.bind(null, sightseeingId) : createSightseeing;
  const [state, formAction] = useActionState(action, undefined);
  const v = defaultValues ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Activity details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Activity name</Label>
            <Input id="name" name="name" defaultValue={v.name} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="destination">Destination</Label>
            <Input id="destination" name="destination" defaultValue={v.destination} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="duration">Duration</Label>
            <Input id="duration" name="duration" placeholder="e.g. Half Day, 3 hours" defaultValue={v.duration} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price">Price per person (₹)</Label>
            <Input id="price" name="price" type="number" min={0} defaultValue={v.price} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={v.description} rows={4} />
          </div>
        </CardContent>
      </Card>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex justify-end">
        <SubmitButton>{mode === "edit" ? "Save changes" : "Add activity"}</SubmitButton>
      </div>
    </form>
  );
}
