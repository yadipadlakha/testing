"use client";

import { useActionState, useState } from "react";
import { createVehicle, updateVehicle } from "@/lib/actions/transport-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { VEHICLE_TYPES, AC_TYPES, TRIP_TYPES, VEHICLE_AMENITIES } from "@/lib/transport";

type VehicleFormValues = {
  vehicleType?: string;
  subType?: string;
  acType?: string;
  seats?: number | "";
  vehicleNumber?: string;
  tripTypes?: string[];
  title?: string;
  location?: string;
  packagesStarting?: string;
  recommendedDriver?: string;
  amenities?: string[];
};

export function VehicleForm({
  mode,
  vehicleId,
  defaultValues,
}: {
  mode: "create" | "edit";
  vehicleId?: string;
  defaultValues?: VehicleFormValues;
}) {
  const action = mode === "edit" && vehicleId ? updateVehicle.bind(null, vehicleId) : createVehicle;
  const [state, formAction] = useActionState(action, undefined);
  const v = defaultValues ?? {};

  const [tripTypes, setTripTypes] = useState<Set<string>>(new Set(v.tripTypes ?? []));
  const [amenities, setAmenities] = useState<Set<string>>(new Set(v.amenities ?? []));

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, value: string) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSet(next);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Vehicle Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vehicleType">Vehicle Type</Label>
            <Select id="vehicleType" name="vehicleType" defaultValue={v.vehicleType ?? ""} required>
              <option value="">-- Select Type --</option>
              {VEHICLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subType">Sub Type</Label>
            <Input id="subType" name="subType" placeholder="e.g. Toyota Innova" defaultValue={v.subType} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acType">AC or NONAC</Label>
            <Select id="acType" name="acType" defaultValue={v.acType ?? "AC"}>
              {AC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seats">Seats</Label>
            <Input id="seats" name="seats" type="number" min={1} defaultValue={v.seats} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vehicleNumber">Vehicle Number</Label>
            <Input id="vehicleNumber" name="vehicleNumber" defaultValue={v.vehicleNumber} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={v.title} required />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
            <Label>Trip Types</Label>
            <div className="flex flex-wrap gap-2">
              {TRIP_TYPES.map((type) => (
                <label
                  key={type.value}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="checkbox"
                    name="tripTypes"
                    value={type.value}
                    checked={tripTypes.has(type.value)}
                    onChange={() => toggle(tripTypes, setTripTypes, type.value)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  {type.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" placeholder="Insert location…" defaultValue={v.location} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="packagesStarting">Packages Starting</Label>
            <Input id="packagesStarting" name="packagesStarting" defaultValue={v.packagesStarting} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recommendedDriver">Recommended Driver</Label>
            <Input id="recommendedDriver" name="recommendedDriver" defaultValue={v.recommendedDriver} />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
            <Label>Vehicle Amenities</Label>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_AMENITIES.map((amenity) => (
                <label
                  key={amenity}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="checkbox"
                    name="amenities"
                    value={amenity}
                    checked={amenities.has(amenity)}
                    onChange={() => toggle(amenities, setAmenities, amenity)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  {amenity}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-success">{state.success}</p> : null}

      <div className="flex justify-end">
        <SubmitButton>{mode === "edit" ? "Save changes" : "Save and Continue"}</SubmitButton>
      </div>
    </form>
  );
}
