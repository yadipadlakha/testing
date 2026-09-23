"use client";

import { useActionState } from "react";
import { createManualItinerary } from "@/lib/actions/itinerary-actions";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { PenLine } from "lucide-react";

export function ManualItineraryForm({ tripId }: { tripId: string }) {
  const action = createManualItinerary.bind(null, tripId);
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Textarea name="summary" placeholder="Trip overview / notes for the client (optional)" rows={2} />
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <SubmitButton variant="outline" className="flex items-center gap-1.5 self-start">
        <PenLine className="h-4 w-4" />
        Start building manually
      </SubmitButton>
    </form>
  );
}
