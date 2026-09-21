"use client";

import { useActionState } from "react";
import { createClient } from "@/lib/actions/client-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";

export default function NewClientPage() {
  const [state, formAction] = useActionState(createClient, undefined);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">New client</h1>
      <Card>
        <CardHeader>
          <CardTitle>Contact details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source">Lead source</Label>
              <Input id="source" name="source" placeholder="Referral, Instagram, website..." />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Preferences, budget range, anything useful..." />
            </div>
            {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
            <SubmitButton className="self-start">Create client</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
