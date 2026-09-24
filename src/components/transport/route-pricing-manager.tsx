"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { addRoutePricing, deleteRoutePricing } from "@/lib/actions/transport-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type RoutePricingRow = {
  id: string;
  routeName: string;
  pricePerKm: number | null;
  nightCharge: number | null;
  tollTax: number | null;
  driverAllowance: number | null;
  totalPrice: number | null;
};

export function RoutePricingManager({
  transportId,
  availableRoutes,
  pricing,
}: {
  transportId: string;
  availableRoutes: { id: string; name: string }[];
  pricing: RoutePricingRow[];
}) {
  const [state, formAction] = useActionState(addRoutePricing.bind(null, transportId), undefined);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Route Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="routeId">Route</Label>
              <Select id="routeId" name="routeId" defaultValue="" required>
                <option value="">-- Select Route --</option>
                {availableRoutes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pricePerKm">Price/KM</Label>
                <Input id="pricePerKm" name="pricePerKm" type="number" min={0} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nightCharge">Night Charge</Label>
                <Input id="nightCharge" name="nightCharge" type="number" min={0} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tollTax">Toll Tax</Label>
                <Input id="tollTax" name="tollTax" type="number" min={0} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="driverAllowance">Driver Allow.</Label>
                <Input id="driverAllowance" name="driverAllowance" type="number" min={0} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="totalPrice">Total Price</Label>
                <Input id="totalPrice" name="totalPrice" type="number" min={0} />
              </div>
            </div>

            {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            {state?.success ? <p className="text-sm text-success">{state.success}</p> : null}

            <div className="flex justify-end">
              <SubmitButton>Save Pricing</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Route-wise Pricing Details</CardTitle>
        </CardHeader>
        <CardContent>
          {pricing.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No route pricing added yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {pricing.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="text-sm">
                    <p className="font-medium text-foreground">{row.routeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.pricePerKm != null ? `Price/KM ${formatCurrency(row.pricePerKm)} · ` : ""}
                      {row.nightCharge != null ? `Night ${formatCurrency(row.nightCharge)} · ` : ""}
                      {row.tollTax != null ? `Toll ${formatCurrency(row.tollTax)} · ` : ""}
                      {row.driverAllowance != null ? `Driver ${formatCurrency(row.driverAllowance)} · ` : ""}
                      {row.totalPrice != null ? `Total ${formatCurrency(row.totalPrice)}` : ""}
                    </p>
                  </div>
                  <form action={deleteRoutePricing.bind(null, transportId, row.id)}>
                    <Button variant="destructive" size="sm" type="submit">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
