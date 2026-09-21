"use client";

import { useActionState } from "react";
import { addInteraction } from "@/lib/actions/client-actions";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { INTERACTION_TYPES, INTERACTION_TYPE_LABEL } from "@/lib/labels";

export function InteractionForm({ clientId }: { clientId: string }) {
  const action = addInteraction.bind(null, clientId);
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <Select name="type" defaultValue="NOTE">
          {INTERACTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {INTERACTION_TYPE_LABEL[type]}
            </option>
          ))}
        </Select>
        <Input name="subject" placeholder="Subject, e.g. 'Discussed Bali itinerary'" required />
      </div>
      <Textarea name="content" placeholder="Details (optional)" rows={2} />
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <SubmitButton size="sm" className="self-start">
        Log interaction
      </SubmitButton>
    </form>
  );
}
