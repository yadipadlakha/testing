"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { formatDate } from "@/lib/enquiry";
import { BOOKING_STATUSES } from "@/lib/hotel-booking";
import { type ActivityBookingDetails, type ActivityRateBand } from "@/lib/activity-booking";
import { ActivityBookingEditor } from "./activity-booking-editor";

type ActivityItemDraft = {
  id: string;
  category: "SIGHTSEEING";
  description: string;
  quantity: number;
  unitPrice: number;
  details?: unknown;
};

type ActivityOption = { id: string; name: string; city: string; rates: ActivityRateBand[]; flatPrice: number | null };

export function ActivityBookingSection({
  items,
  currency,
  travelTo,
  travelDateIso,
  tripAdults,
  tripChildren,
  activities,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
}: {
  items: ActivityItemDraft[];
  currency: string;
  travelTo: string;
  travelDateIso: string;
  tripAdults: number;
  tripChildren: number;
  activities: ActivityOption[];
  onAddItem: (description: string, unitPrice: number, details: ActivityBookingDetails) => void;
  onUpdateItem: (id: string, patch: Partial<ActivityItemDraft>) => void;
  onRemoveItem: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  if (adding || editingId) {
    const editingItem = editingId ? items.find((i) => i.id === editingId) : null;
    const initial = (editingItem?.details as ActivityBookingDetails | undefined) ?? null;
    return (
      <ActivityBookingEditor
        travelTo={travelTo}
        travelDateIso={travelDateIso}
        tripAdults={tripAdults}
        tripChildren={tripChildren}
        activities={activities}
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
        <CardTitle>Activities</CardTitle>
        <span className="text-sm font-medium text-foreground">Subtotal: {formatCurrency(subtotal, currency)}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Activity Booking
        </Button>

        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No activity bookings yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const details = item.details as ActivityBookingDetails | undefined;
              const statusLabel = details ? BOOKING_STATUSES.find((s) => s.value === details.status)?.label : null;
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.description}</p>
                    {details ? (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(details.activityDate)}
                        {statusLabel ? ` · ${statusLabel}` : ""}
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
