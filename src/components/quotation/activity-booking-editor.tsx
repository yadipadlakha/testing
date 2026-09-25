"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CURRENCIES } from "@/lib/enquiry";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BOOKING_STATUSES, splitCities, matchesCity, type BookingStatus } from "@/lib/hotel-booking";
import {
  TRANSFER_OPTIONS,
  TIME_SLOTS,
  findActivityRateForDate,
  computeActivityTotals,
  type ActivityBookingDetails,
  type ActivityRateBand,
} from "@/lib/activity-booking";

const NO_SPINNER =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

type ActivityOption = { id: string; name: string; city: string; rates: ActivityRateBand[]; flatPrice: number | null };

function emptyDraft(currency: string, activityDate: string): ActivityBookingDetails {
  return {
    city: "",
    activityId: null,
    activityName: "",
    activityCity: "",
    alternateActivityId: null,
    alternateActivityName: null,
    activityDate,
    transferOption: "PRIVATE",
    timeSlot: "",
    currency,
    status: "AVAILABLE",
    adultRate: 0,
    adultQty: 0,
    adultAdditionalCost: 0,
    childRate: 0,
    childQty: 0,
    childAdditionalCost: 0,
    infantRate: 0,
    infantQty: 0,
    infantAdditionalCost: 0,
    subTotal: 0,
    grandTotal: 0,
  };
}

export function ActivityBookingEditor({
  travelTo,
  travelDateIso,
  tripAdults,
  tripChildren,
  activities,
  initial,
  onCancel,
  onSave,
}: {
  travelTo: string;
  travelDateIso: string;
  tripAdults: number;
  tripChildren: number;
  activities: ActivityOption[];
  initial: ActivityBookingDetails | null;
  onCancel: () => void;
  onSave: (details: ActivityBookingDetails, description: string, unitPrice: number) => void;
}) {
  const [draft, setDraft] = useState<ActivityBookingDetails>(
    () =>
      initial ?? {
        ...emptyDraft("INR", travelDateIso),
        adultQty: tripAdults,
        childQty: tripChildren,
      },
  );
  const [alternateEnabled, setAlternateEnabled] = useState(Boolean(initial?.alternateActivityId));

  function patch(fields: Partial<ActivityBookingDetails>) {
    setDraft((prev) => ({ ...prev, ...fields }));
  }

  const cities = splitCities(travelTo);
  const cityFiltered = draft.city ? activities.filter((a) => matchesCity(a.city, draft.city)) : activities;
  const activityOptions = cityFiltered.length > 0 ? cityFiltered : activities;

  function selectActivity(id: string) {
    const activity = activities.find((a) => a.id === id);
    if (!activity) return;
    const rate = findActivityRateForDate(activity.rates, draft.activityDate);
    patch({
      activityId: activity.id,
      activityName: activity.name,
      activityCity: activity.city,
      adultRate: rate?.adultRate ?? activity.flatPrice ?? 0,
      childRate: rate?.childRate ?? 0,
      infantRate: rate?.infantRate ?? 0,
      timeSlot: "",
    });
  }

  function selectAlternate(id: string) {
    const activity = activities.find((a) => a.id === id);
    patch({ alternateActivityId: id || null, alternateActivityName: activity?.name ?? null });
  }

  function changeDate(date: string) {
    const activity = activities.find((a) => a.id === draft.activityId);
    if (!activity) {
      patch({ activityDate: date });
      return;
    }
    const rate = findActivityRateForDate(activity.rates, date);
    patch({
      activityDate: date,
      adultRate: rate?.adultRate ?? activity.flatPrice ?? 0,
      childRate: rate?.childRate ?? 0,
      infantRate: rate?.infantRate ?? 0,
    });
  }

  const totals = computeActivityTotals(draft);
  const canSave = Boolean(draft.activityId) && Boolean(draft.activityDate);

  function handleSave() {
    const finalDraft: ActivityBookingDetails = { ...draft, subTotal: totals.subTotal, grandTotal: totals.grandTotal };
    const paxParts = [
      draft.adultQty > 0 ? `${draft.adultQty} Adult${draft.adultQty > 1 ? "s" : ""}` : null,
      draft.childQty > 0 ? `${draft.childQty} Child${draft.childQty > 1 ? "ren" : ""}` : null,
      draft.infantQty > 0 ? `${draft.infantQty} Infant${draft.infantQty > 1 ? "s" : ""}` : null,
    ].filter(Boolean);
    const description = `${draft.activityName} — ${draft.activityCity}, ${draft.activityDate}${paxParts.length ? ` (${paxParts.join(", ")})` : ""}`;
    onSave(finalDraft, description, totals.grandTotal);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activityCitySelect">City</Label>
            <Select id="activityCitySelect" value={draft.city} onChange={(e) => patch({ city: e.target.value })}>
              <option value="">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activitySelect">Activity</Label>
            <Select id="activitySelect" value={draft.activityId ?? ""} onChange={(e) => selectActivity(e.target.value)}>
              <option value="">-- Select Activity --</option>
              {activityOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activityPassengers">Passengers</Label>
            <Input id="activityPassengers" value={`${tripAdults} Adults, ${tripChildren} Children`} disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activityDate">Activity Date</Label>
            <Input id="activityDate" type="date" value={draft.activityDate} onChange={(e) => changeDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transferOption">Transfer Option</Label>
            <Select id="transferOption" value={draft.transferOption} onChange={(e) => patch({ transferOption: e.target.value })}>
              {TRANSFER_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="timeSlot">Time Slot</Label>
          {draft.activityId && draft.activityDate ? (
            <Select id="timeSlot" value={draft.timeSlot} onChange={(e) => patch({ timeSlot: e.target.value })} className="max-w-xs">
              <option value="">-- Select Time Slot --</option>
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">Select activity and date first</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Activity Price Breakdown</Label>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                  <th className="px-3 py-2">Passenger</th>
                  <th className="px-3 py-2">Rate</th>
                  <th className="px-2 py-2 text-center">×</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-2 py-2 text-center">+</th>
                  <th className="px-3 py-2">Additional Cost</th>
                  <th className="px-2 py-2 text-center">=</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <PassengerRow
                  label="Adult"
                  rate={draft.adultRate}
                  qty={draft.adultQty}
                  additionalCost={draft.adultAdditionalCost}
                  total={totals.adultTotal}
                  currency={draft.currency}
                  onRate={(v) => patch({ adultRate: v })}
                  onQty={(v) => patch({ adultQty: v })}
                  onAdditionalCost={(v) => patch({ adultAdditionalCost: v })}
                />
                <PassengerRow
                  label="Child"
                  rate={draft.childRate}
                  qty={draft.childQty}
                  additionalCost={draft.childAdditionalCost}
                  total={totals.childTotal}
                  currency={draft.currency}
                  onRate={(v) => patch({ childRate: v })}
                  onQty={(v) => patch({ childQty: v })}
                  onAdditionalCost={(v) => patch({ childAdditionalCost: v })}
                />
                <PassengerRow
                  label="Infant"
                  rate={draft.infantRate}
                  qty={draft.infantQty}
                  additionalCost={draft.infantAdditionalCost}
                  total={totals.infantTotal}
                  currency={draft.currency}
                  onRate={(v) => patch({ infantRate: v })}
                  onQty={(v) => patch({ infantQty: v })}
                  onAdditionalCost={(v) => patch({ infantAdditionalCost: v })}
                />
              </tbody>
            </table>
          </div>
          <div className="ml-auto flex w-full max-w-xs flex-col gap-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Sub Total</span>
              <span className="text-foreground">{formatCurrency(totals.subTotal, draft.currency)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 text-base font-semibold text-foreground">
              <span>Grand Total</span>
              <span>{formatCurrency(totals.grandTotal, draft.currency)}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Alternate Activity</Label>
            <label className="flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm">
              <input
                type="checkbox"
                checked={alternateEnabled}
                onChange={(e) => {
                  setAlternateEnabled(e.target.checked);
                  if (!e.target.checked) patch({ alternateActivityId: null, alternateActivityName: null });
                }}
                className="h-3.5 w-3.5 accent-primary"
              />
              {alternateEnabled ? (
                <select
                  value={draft.alternateActivityId ?? ""}
                  onChange={(e) => selectAlternate(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                >
                  <option value="">Select Alternate Activity</option>
                  {activityOptions
                    .filter((a) => a.id !== draft.activityId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              ) : (
                <span className="text-muted-foreground">Select Alternate Activity</span>
              )}
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activityCurrency">Currency</Label>
            <Select id="activityCurrency" value={draft.currency} onChange={(e) => patch({ currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activityStatus">Activity Status</Label>
            <Select
              id="activityStatus"
              value={draft.status}
              onChange={(e) => patch({ status: e.target.value as BookingStatus })}
            >
              {BOOKING_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Close
          </Button>
          <Button type="button" disabled={!canSave} onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PassengerRow({
  label,
  rate,
  qty,
  additionalCost,
  total,
  currency,
  onRate,
  onQty,
  onAdditionalCost,
}: {
  label: string;
  rate: number;
  qty: number;
  additionalCost: number;
  total: number;
  currency: string;
  onRate: (v: number) => void;
  onQty: (v: number) => void;
  onAdditionalCost: (v: number) => void;
}) {
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-3 py-2 font-medium text-foreground">{label}</td>
      <td className="px-3 py-2">
        <Input
          type="number"
          min={0}
          value={rate}
          onChange={(e) => onRate(Number(e.target.value) || 0)}
          className={cn("w-24", NO_SPINNER)}
        />
      </td>
      <td className="px-2 py-2 text-center text-muted-foreground">×</td>
      <td className="px-3 py-2">
        <Input type="number" min={0} value={qty} onChange={(e) => onQty(Number(e.target.value) || 0)} className="w-16" />
      </td>
      <td className="px-2 py-2 text-center text-muted-foreground">+</td>
      <td className="px-3 py-2">
        <Input
          type="number"
          min={0}
          value={additionalCost}
          onChange={(e) => onAdditionalCost(Number(e.target.value) || 0)}
          className={cn("w-24", NO_SPINNER)}
        />
      </td>
      <td className="px-2 py-2 text-center text-muted-foreground">=</td>
      <td className="px-3 py-2 text-right font-medium text-foreground">{formatCurrency(total, currency)}</td>
    </tr>
  );
}
