"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";
import { sendQuotationEmail } from "@/lib/actions/quotation-email-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SendQuotationForm({ quotationId }: { quotationId: string }) {
  const [state, formAction] = useActionState(sendQuotationEmail.bind(null, quotationId), undefined);

  return (
    <details className="group">
      <summary className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer list-none print:hidden")}>
        <Mail className="h-4 w-4" /> Send
      </summary>

      <form action={formAction} className="mt-3 flex flex-col gap-3 rounded-md border border-border p-4 print:hidden">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="send-email">Recipient email</Label>
          <Input id="send-email" name="email" type="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="send-message">Message (optional)</Label>
          <Textarea id="send-message" name="message" rows={3} />
        </div>
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        {state?.success ? <p className="text-sm text-success">{state.success}</p> : null}
        <div className="flex justify-end">
          <SubmitButton>Send email</SubmitButton>
        </div>
      </form>
    </details>
  );
}
