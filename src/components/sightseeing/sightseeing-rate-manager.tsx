"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { addSightseeingRate, deleteSightseeingRate } from "@/lib/actions/sightseeing-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { formatDate } from "@/lib/enquiry";
import { DAY_LABELS } from "@/lib/sightseeing";
import type { SightseeingRate } from "@prisma/client";

export function SightseeingRateManager({
  sightseeingId,
  rates,
}: {
  sightseeingId: string;
  rates: SightseeingRate[];
}) {
  const [state, formAction] = useActionState(addSightseeingRate.bind(null, sightseeingId), undefined);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Add rate</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div>
              <Label>Select Days</Label>
              <div className="mt-1.5 flex flex-wrap gap-3">
                {DAY_LABELS.map((day) => (
                  <label key={day.code} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      name="daysOfWeek"
                      value={day.code}
                      defaultChecked
                      className="h-4 w-4 accent-primary"
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="endDate">End date</Label>
                <Input id="endDate" name="endDate" type="date" required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="adultRate">Adult rate</Label>
                <Input id="adultRate" name="adultRate" type="number" min={0} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="minAdult">Min adult</Label>
                <Input id="minAdult" name="minAdult" type="number" min={0} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="maxAdult">Max adult</Label>
                <Input id="maxAdult" name="maxAdult" type="number" min={0} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="childRate">Child rate</Label>
                <Input id="childRate" name="childRate" type="number" min={0} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="minChild">Min child</Label>
                <Input id="minChild" name="minChild" type="number" min={0} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="maxChild">Max child</Label>
                <Input id="maxChild" name="maxChild" type="number" min={0} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="infantRate">Infant rate</Label>
                <Input id="infantRate" name="infantRate" type="number" min={0} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="minInfant">Min infant</Label>
                <Input id="minInfant" name="minInfant" type="number" min={0} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="maxInfant">Max infant</Label>
                <Input id="maxInfant" name="maxInfant" type="number" min={0} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">Name (title)</Label>
                <Input id="title" name="title" placeholder="e.g. Peak season" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cancelPolicy">Cancellation policy</Label>
                <Input id="cancelPolicy" name="cancelPolicy" placeholder="e.g. Free cancellation up to 24 hours before" />
              </div>
            </div>

            {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            {state?.success ? <p className="text-sm text-success">{state.success}</p> : null}

            <div className="flex justify-end">
              <SubmitButton>Add rate</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      {rates.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Rate bands</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {rates.map((rate) => (
              <div
                key={rate.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    {rate.title || "Untitled"} · {formatDate(rate.startDate)} – {formatDate(rate.endDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rate.daysOfWeek.join(", ")}
                    {rate.adultRate != null ? ` · Adult ${formatCurrency(rate.adultRate)}` : ""}
                    {rate.childRate != null ? ` · Child ${formatCurrency(rate.childRate)}` : ""}
                    {rate.infantRate != null ? ` · Infant ${formatCurrency(rate.infantRate)}` : ""}
                  </p>
                  {rate.cancelPolicy ? <p className="text-xs text-muted-foreground">{rate.cancelPolicy}</p> : null}
                </div>
                <form action={deleteSightseeingRate.bind(null, sightseeingId, rate.id)}>
                  <Button variant="destructive" size="sm" type="submit">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
