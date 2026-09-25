"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { formatDate } from "@/lib/enquiry";
import { type TransportBookingDetails } from "@/lib/transport-booking";
import { TransportBookingEditor } from "./transport-booking-editor";

type TransportItemDraft = {
  id: string;
  category: "TRANSPORT";
  description: string;
  quantity: number;
  unitPrice: number;
  details?: unknown;
};

type TransportVehicleOption = {
  id: string;
  title: string;
  vehicleType: string;
  subType: string;
  acType: string;
  seats: number | null;
};

type TransportRouteOption = { id: string; name: string; actualDistanceKm: number | null };
type RoutePricingOption = { vehicleId: string; routeId: string; totalPrice: number | null };

export function TransportBookingSection({
  items,
  currency,
  travelDateIso,
  durationDays,
  vehicles,
  routes,
  routePricing,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
}: {
  items: TransportItemDraft[];
  currency: string;
  travelDateIso: string;
  durationDays: number;
  vehicles: TransportVehicleOption[];
  routes: TransportRouteOption[];
  routePricing: RoutePricingOption[];
  onAddItem: (description: string, unitPrice: number, details: TransportBookingDetails) => void;
  onUpdateItem: (id: string, patch: Partial<TransportItemDraft>) => void;
  onRemoveItem: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  if (adding || editingId) {
    const editingItem = editingId ? items.find((i) => i.id === editingId) : null;
    const initial = (editingItem?.details as TransportBookingDetails | undefined) ?? null;
    return (
      <TransportBookingEditor
        travelDateIso={travelDateIso}
        durationDays={durationDays}
        currency={currency}
        vehicles={vehicles}
        routes={routes}
        routePricing={routePricing}
        initial={initial}
        onCancel={() => {
          setAdding(false);
          setEditingId(null);
        }}
        onSave={(details, description, unitPrice) => {
          if (editingId) {
            onUpdateItem(editingId, { description, unitPrice, quantity: 1, details });
          } else {
            onAddItem(description, unitPrice, details);
          }
          setAdding(false);
          setEditingId(null);
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Transport</CardTitle>
        <span className="text-sm font-medium text-foreground">Subtotal: {formatCurrency(subtotal, currency)}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Transport Booking
        </Button>

        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No transport bookings yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const details = item.details as TransportBookingDetails | undefined;
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.description}</p>
                    {details && details.legs.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(details.legs[0].date)} – {formatDate(details.legs[details.legs.length - 1].date)}
                        {details.acType ? ` · ${details.acType}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(item.unitPrice * item.quantity, currency)}
                    </span>
                    {details ? (
                      <Button type="button" variant="outline" size="sm" aria-label="Edit" onClick={() => setEditingId(item.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    <Button type="button" variant="destructive" size="icon-sm" aria-label="Remove" onClick={() => onRemoveItem(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
