"use client";

import { useActionState } from "react";
import { generateTripItinerary } from "@/lib/actions/trip-actions";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { Sparkles } from "lucide-react";

export function GenerateItineraryForm({ tripId, regenerate }: { tripId: string; regenerate?: boolean }) {
  const action = generateTripItinerary.bind(null, tripId);
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Textarea
        name="preferences"
        placeholder="Anything the AI should factor in — pace, interests (food, hiking, museums), accessibility needs, must-see spots..."
        rows={3}
      />
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <SubmitButton className="flex items-center gap-1.5 self-start">
        <Sparkles className="h-4 w-4" />
        {regenerate ? "Regenerate itinerary" : "Generate itinerary with AI"}
      </SubmitButton>
    </form>
  );
}
