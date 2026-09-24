"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createSightseeing, updateSightseeing, createActivityType } from "@/lib/actions/sightseeing-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { COUNTRIES } from "@/lib/countries";

type SightseeingFormValues = {
  name?: string;
  country?: string;
  city?: string;
  starRating?: number | "";
  duration?: string;
  address?: string;
  latitude?: number | "";
  longitude?: number | "";
  contactPhone?: string;
  tourSummary?: string;
  price?: number | "";
};

export function SightseeingForm({
  mode,
  sightseeingId,
  defaultValues,
  allActivityTypes,
  selectedActivityTypeIds,
}: {
  mode: "create" | "edit";
  sightseeingId?: string;
  defaultValues?: SightseeingFormValues;
  allActivityTypes: { id: string; name: string }[];
  selectedActivityTypeIds: string[];
}) {
  const action = mode === "edit" && sightseeingId ? updateSightseeing.bind(null, sightseeingId) : createSightseeing;
  const [state, formAction] = useActionState(action, undefined);
  const v = defaultValues ?? {};

  const [types, setTypes] = useState(allActivityTypes);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(selectedActivityTypeIds));
  const [newTypeName, setNewTypeName] = useState("");
  const [addTypeError, setAddTypeError] = useState<string | null>(null);
  const [isAddingType, startAddType] = useTransition();

  function toggleType(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAddType() {
    const trimmed = newTypeName.trim();
    if (!trimmed) return;
    startAddType(async () => {
      const formData = new FormData();
      formData.set("name", trimmed);
      const result = await createActivityType(undefined, formData);
      if (result?.error) {
        setAddTypeError(result.error);
        return;
      }
      if (result?.type) {
        setTypes((prev) => (prev.some((t) => t.id === result.type!.id) ? prev : [...prev, result.type!]));
        setSelectedIds((prev) => new Set(prev).add(result.type!.id));
        setNewTypeName("");
        setAddTypeError(null);
      }
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country">Country</Label>
            <Select id="country" name="country" defaultValue={v.country ?? ""} required>
              <option value="">-- Select country --</option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={v.city} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Activity name</Label>
            <Input id="name" name="name" defaultValue={v.name} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="starRating">Star rating</Label>
            <Input id="starRating" name="starRating" type="number" min={0} max={5} step={0.5} defaultValue={v.starRating} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="duration">Duration</Label>
            <Input id="duration" name="duration" placeholder="e.g. 2 hours" defaultValue={v.duration} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactPhone">Contact no.</Label>
            <Input id="contactPhone" name="contactPhone" defaultValue={v.contactPhone} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={v.address} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="latitude">Latitude</Label>
            <Input id="latitude" name="latitude" type="number" step="any" defaultValue={v.latitude} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="longitude">Longitude</Label>
            <Input id="longitude" name="longitude" type="number" step="any" defaultValue={v.longitude} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price">Starting price per person (₹)</Label>
            <Input id="price" name="price" type="number" min={0} defaultValue={v.price} />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Activity Type</Label>
            <div className="flex flex-wrap items-center gap-2">
              {types.map((type) => (
                <label
                  key={type.id}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="checkbox"
                    name="activityTypeIds"
                    value={type.id}
                    checked={selectedIds.has(type.id)}
                    onChange={() => toggleType(type.id)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  {type.name}
                </label>
              ))}
            </div>
            <div className="mt-1 flex gap-2">
              <Input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="New activity type name"
                className="max-w-xs"
              />
              <Button type="button" variant="outline" size="sm" disabled={isAddingType} onClick={handleAddType}>
                <Plus className="h-3.5 w-3.5" /> Manage Type
              </Button>
            </div>
            {addTypeError ? <p className="text-sm text-destructive">{addTypeError}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="tourSummary">Tour summary</Label>
            <Textarea id="tourSummary" name="tourSummary" defaultValue={v.tourSummary} rows={6} />
          </div>
        </CardContent>
      </Card>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-success">{state.success}</p> : null}

      <div className="flex justify-end">
        <SubmitButton>{mode === "edit" ? "Save changes" : "Add activity"}</SubmitButton>
      </div>
    </form>
  );
}
