"use client";

import { useActionState } from "react";
import { createEnquiry, updateEnquiry } from "@/lib/actions/enquiry-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TYPE_LABELS } from "@/lib/enquiry";

type EnquiryFormValues = {
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  companyName?: string;
  type?: string;
  travelFrom?: string;
  travelTo?: string;
  travelDate?: string;
  durationDays?: number;
  adults?: number;
  children?: number;
  followDate?: string;
  notes?: string;
  allocatedToId?: string;
};

export function EnquiryForm({
  mode,
  enquiryId,
  defaultValues,
  employees,
  isAdmin,
}: {
  mode: "create" | "edit";
  enquiryId?: string;
  defaultValues?: EnquiryFormValues;
  employees: { id: string; name: string }[];
  isAdmin: boolean;
}) {
  const action = mode === "edit" && enquiryId ? updateEnquiry.bind(null, enquiryId) : createEnquiry;
  const [state, formAction] = useActionState(action, undefined);
  const v = defaultValues ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Client details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clientName">Client name</Label>
            <Input id="clientName" name="clientName" defaultValue={v.clientName} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clientPhone">Mobile number</Label>
            <Input id="clientPhone" name="clientPhone" defaultValue={v.clientPhone} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clientEmail">Email</Label>
            <Input id="clientEmail" name="clientEmail" type="email" defaultValue={v.clientEmail} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyName">Agency / company name</Label>
            <Input id="companyName" name="companyName" defaultValue={v.companyName} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trip details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Enquiry type</Label>
            <Select id="type" name="type" defaultValue={v.type ?? "HOLIDAY_PACKAGE"}>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="travelFrom">Travel from</Label>
            <Input id="travelFrom" name="travelFrom" defaultValue={v.travelFrom} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="travelTo">Travel to (destination)</Label>
            <Input id="travelTo" name="travelTo" defaultValue={v.travelTo} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="travelDate">Travel date</Label>
            <Input id="travelDate" name="travelDate" type="date" defaultValue={v.travelDate} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="durationDays">Duration (days)</Label>
            <Input id="durationDays" name="durationDays" type="number" min={1} defaultValue={v.durationDays ?? 1} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="followDate">Follow-up date</Label>
            <Input id="followDate" name="followDate" type="date" defaultValue={v.followDate} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adults">Adults</Label>
            <Input id="adults" name="adults" type="number" min={1} defaultValue={v.adults ?? 1} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="children">Children</Label>
            <Input id="children" name="children" type="number" min={0} defaultValue={v.children ?? 0} />
          </div>
          {isAdmin ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="allocatedToId">Allocated to</Label>
              <Select id="allocatedToId" name="allocatedToId" defaultValue={v.allocatedToId ?? ""}>
                <option value="">Unassigned</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={v.notes} rows={4} />
          </div>
        </CardContent>
      </Card>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex justify-end">
        <SubmitButton>{mode === "edit" ? "Save changes" : "Create enquiry"}</SubmitButton>
      </div>
    </form>
  );
}
