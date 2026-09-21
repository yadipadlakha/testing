"use client";

import { useActionState } from "react";
import { addItineraryActivity } from "@/lib/actions/itinerary-actions";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { ACTIVITY_CATEGORY_LABEL } from "@/lib/labels";
import type { ActivityCategory } from "@prisma/client";
import { Plus } from "lucide-react";

const CATEGORIES = Object.keys(ACTIVITY_CATEGORY_LABEL) as ActivityCategory[];

export function AddActivityForm({ tripId, dayId }: { tripId: string; dayId: string }) {
  const action = addItineraryActivity.bind(null, tripId, dayId);
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3">
      <div className="flex flex-wrap gap-2">
        <Input name="startTime" placeholder="09:00" className="w-24" />
        <Input name="title" placeholder="Activity title" className="min-w-[180px] flex-1" required />
        <Select name="category" defaultValue="ACTIVITY" className="w-auto">
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {ACTIVITY_CATEGORY_LABEL[category]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input name="location" placeholder="Location (optional)" className="min-w-[140px] flex-1" />
        <Input name="durationMinutes" type="number" min={0} placeholder="Duration (min)" className="w-36" />
        <Input name="estimatedCost" type="number" min={0} step="0.01" placeholder="Est. cost" className="w-32" />
      </div>
      <Input name="description" placeholder="Description (optional)" />
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <SubmitButton size="sm" variant="secondary" className="flex items-center gap-1.5 self-start">
        <Plus className="h-3.5 w-3.5" /> Add activity
      </SubmitButton>
    </form>
  );
}
