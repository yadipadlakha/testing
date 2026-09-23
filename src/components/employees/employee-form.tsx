"use client";

import { useActionState } from "react";
import { createEmployee } from "@/lib/actions/employee-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ModuleCheckboxes } from "@/components/employees/module-checkboxes";

export function EmployeeForm() {
  const [state, formAction] = useActionState(createEmployee, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Login details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="password">Temporary password</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
            <p className="text-xs text-muted-foreground">Share this with the employee — they can change it later from Forgot Password.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Module access</CardTitle>
        </CardHeader>
        <CardContent>
          <ModuleCheckboxes />
        </CardContent>
      </Card>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex justify-end">
        <SubmitButton>Create employee</SubmitButton>
      </div>
    </form>
  );
}
