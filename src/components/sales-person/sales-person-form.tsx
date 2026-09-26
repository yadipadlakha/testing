"use client";

import { useActionState } from "react";
import { createSalesPerson, updateSalesPerson } from "@/lib/actions/sales-person-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type SalesPersonFormValues = {
  name?: string;
  contactNumber?: string;
  email?: string;
  city?: string;
  state?: string;
  country?: string;
};

export function SalesPersonForm({
  mode,
  salesPersonId,
  defaultValues,
}: {
  mode: "create" | "edit";
  salesPersonId?: string;
  defaultValues?: SalesPersonFormValues;
}) {
  const action = mode === "edit" && salesPersonId ? updateSalesPerson.bind(null, salesPersonId) : createSalesPerson;
  const [state, formAction] = useActionState(action, undefined);
  const v = defaultValues ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Sales person details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={v.name} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactNumber">Contact number</Label>
            <Input id="contactNumber" name="contactNumber" defaultValue={v.contactNumber} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email ID</Label>
            <Input id="email" name="email" type="email" defaultValue={v.email} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={v.city} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" defaultValue={v.state} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" defaultValue={v.country} />
          </div>
        </CardContent>
      </Card>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex justify-end">
        <SubmitButton>{mode === "edit" ? "Save changes" : "Add sales person"}</SubmitButton>
      </div>
    </form>
  );
}
