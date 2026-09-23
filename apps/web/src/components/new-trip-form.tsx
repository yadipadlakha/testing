"use client";

import { useActionState } from "react";
import { createTrip } from "@/lib/actions/trip-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";

export function NewTripForm({
  clients,
  defaultClientId,
}: {
  clients: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const [state, formAction] = useActionState(createTrip, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trip details</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clientId">Client</Label>
            <Select id="clientId" name="clientId" defaultValue={defaultClientId ?? ""} required>
              <option value="" disabled>
                Select a client
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Trip title</Label>
            <Input id="title" name="title" placeholder="Honeymoon in Kyoto" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="destination">Destination</Label>
            <Input id="destination" name="destination" placeholder="Kyoto, Japan" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" name="startDate" type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" name="endDate" type="date" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="travelers">Travelers</Label>
              <Input id="travelers" name="travelers" type="number" min={1} defaultValue={1} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budgetAmount">Budget</Label>
              <Input id="budgetAmount" name="budgetAmount" type="number" min={0} step="0.01" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" name="currency" defaultValue="USD" />
            </div>
          </div>
          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          <SubmitButton className="self-start">Create trip</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
