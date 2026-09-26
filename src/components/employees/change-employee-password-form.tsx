"use client";

import { useActionState } from "react";
import { changeEmployeePassword } from "@/lib/actions/employee-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

export function ChangeEmployeePasswordForm({ employeeId }: { employeeId: string }) {
  const [state, formAction] = useActionState(changeEmployeePassword.bind(null, employeeId), undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-success">{state.success}</p> : null}
      <div className="flex justify-end">
        <SubmitButton>Update password</SubmitButton>
      </div>
    </form>
  );
}
