"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAgency } from "@/lib/actions/auth-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

export default function RegisterPage() {
  const [state, formAction] = useActionState(registerAgency, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your agency</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agencyName">Agency name</Label>
            <Input id="agencyName" name="agencyName" placeholder="Blue Horizon Travel" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </div>
          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          <SubmitButton className="w-full">Create account</SubmitButton>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:text-accent/80">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
