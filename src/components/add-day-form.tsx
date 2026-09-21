"use client";

import { useActionState } from "react";
import { addItineraryDay } from "@/lib/actions/itinerary-actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { Plus } from "lucide-react";

export function AddDayForm({ tripId, itineraryId }: { tripId: string; itineraryId: string }) {
  const action = addItineraryDay.bind(null, tripId, itineraryId);
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-slate-300 p-4">
      <div className="flex-1 min-w-[160px]">
        <Input name="title" placeholder="Day theme, e.g. 'Arrival & Old Town'" required />
      </div>
      <div className="flex-1 min-w-[140px]">
        <Input name="location" placeholder="Location (optional)" />
      </div>
      {state?.error ? <p className="w-full text-sm text-red-600">{state.error}</p> : null}
      <SubmitButton size="sm" variant="secondary" className="flex items-center gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add day
      </SubmitButton>
    </form>
  );
}
