"use client";

import { useActionState, useState } from "react";
import { X, Plus } from "lucide-react";
import { createRoute, updateRoute } from "@/lib/actions/transport-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type RouteFormValues = {
  name?: string;
  destinations?: string[];
  itineraryText?: string;
  actualDistanceKm?: number | "";
  displayDistanceKm?: number | "";
  itineraryDurationHours?: number | "";
  activityIds?: string[];
};

export function RouteForm({
  mode,
  routeId,
  defaultValues,
  activityOptions,
}: {
  mode: "create" | "edit";
  routeId?: string;
  defaultValues?: RouteFormValues;
  activityOptions: { id: string; name: string; city: string }[];
}) {
  const action = mode === "edit" && routeId ? updateRoute.bind(null, routeId) : createRoute;
  const [state, formAction] = useActionState(action, undefined);
  const v = defaultValues ?? {};

  const [destinations, setDestinations] = useState<string[]>(v.destinations ?? []);
  const [destinationInput, setDestinationInput] = useState("");
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set(v.activityIds ?? []));

  function addDestination() {
    const trimmed = destinationInput.trim();
    if (!trimmed || destinations.includes(trimmed)) return;
    setDestinations((prev) => [...prev, trimmed]);
    setDestinationInput("");
  }

  function removeDestination(value: string) {
    setDestinations((prev) => prev.filter((d) => d !== value));
  }

  function toggleActivity(id: string) {
    setSelectedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {destinations.map((d) => (
        <input key={d} type="hidden" name="destinations" value={d} />
      ))}

      <Card>
        <CardHeader>
          <CardTitle>{mode === "edit" ? "Edit Route" : "Add New Route"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Route Name</Label>
            <Input id="name" name="name" placeholder="Enter route name" defaultValue={v.name} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="destinationInput">Destinations</Label>
            <div className="flex gap-2">
              <Input
                id="destinationInput"
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDestination();
                  }
                }}
                placeholder="Type to search destination…"
              />
              <Button type="button" variant="outline" onClick={addDestination}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {destinations.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {destinations.map((d) => (
                  <span
                    key={d}
                    className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {d}
                    <button type="button" onClick={() => removeDestination(d)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="itineraryText">Itinerary Text</Label>
            <Textarea
              id="itineraryText"
              name="itineraryText"
              placeholder="Describe the itinerary…"
              rows={5}
              defaultValue={v.itineraryText}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="actualDistanceKm">Actual Distance (km)</Label>
              <Input
                id="actualDistanceKm"
                name="actualDistanceKm"
                type="number"
                min={0}
                placeholder="e.g. 120"
                defaultValue={v.actualDistanceKm}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayDistanceKm">Display Distance</Label>
              <Input
                id="displayDistanceKm"
                name="displayDistanceKm"
                type="number"
                min={0}
                placeholder="e.g. 2"
                defaultValue={v.displayDistanceKm}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="itineraryDurationHours">Itinerary Duration (hrs)</Label>
              <Input
                id="itineraryDurationHours"
                name="itineraryDurationHours"
                type="number"
                min={0}
                placeholder="e.g. 24"
                defaultValue={v.itineraryDurationHours}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Attractions / Activities</Label>
            {activityOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sightseeing activities in the catalog yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activityOptions.map((activity) => (
                  <label
                    key={activity.id}
                    className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="checkbox"
                      name="activityIds"
                      value={activity.id}
                      checked={selectedActivities.has(activity.id)}
                      onChange={() => toggleActivity(activity.id)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    {activity.name} ({activity.city})
                  </label>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex justify-end">
        <SubmitButton>{mode === "edit" ? "Save changes" : "Save Route"}</SubmitButton>
      </div>
    </form>
  );
}
