"use client";

import { useActionState } from "react";
import Link from "next/link";
import { authenticate } from "@/lib/actions/auth-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

export default function LoginPage() {
  const [state, formAction] = useActionState(authenticate, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          <SubmitButton className="w-full">Sign in</SubmitButton>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Setting up your agency for the first time?{" "}
          <Link href="/register" className="font-medium text-accent hover:text-accent/80">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
