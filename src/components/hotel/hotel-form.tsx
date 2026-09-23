"use client";

import { useActionState } from "react";
import { createHotel, updateHotel } from "@/lib/actions/hotel-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type HotelFormValues = {
  name?: string;
  destination?: string;
  starRating?: number | "";
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  pricePerNight?: number | "";
  notes?: string;
};

export function HotelForm({
  mode,
  hotelId,
  defaultValues,
}: {
  mode: "create" | "edit";
  hotelId?: string;
  defaultValues?: HotelFormValues;
}) {
  const action = mode === "edit" && hotelId ? updateHotel.bind(null, hotelId) : createHotel;
  const [state, formAction] = useActionState(action, undefined);
  const v = defaultValues ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Hotel details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Hotel name</Label>
            <Input id="name" name="name" defaultValue={v.name} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="destination">Destination</Label>
            <Input id="destination" name="destination" defaultValue={v.destination} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="starRating">Star rating</Label>
            <Select id="starRating" name="starRating" defaultValue={v.starRating ?? ""}>
              <option value="">Unrated</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} Star
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pricePerNight">Price per night (₹)</Label>
            <Input id="pricePerNight" name="pricePerNight" type="number" min={0} defaultValue={v.pricePerNight} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={v.address} />
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
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input id="contactEmail" name="contactEmail" type="email" defaultValue={v.contactEmail} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={v.notes} rows={4} />
          </div>
        </CardContent>
      </Card>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex justify-end">
        <SubmitButton>{mode === "edit" ? "Save changes" : "Add hotel"}</SubmitButton>
      </div>
    </form>
  );
}
