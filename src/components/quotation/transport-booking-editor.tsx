"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { VEHICLE_TYPES, AC_TYPES } from "@/lib/transport";
import {
  buildDefaultLegs,
  legTotal,
  totalTransportCost,
  type TransportBookingDetails,
  type TransportLeg,
} from "@/lib/transport-booking";

const NO_SPINNER =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

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

function emptyDraft(startDate: string, durationDays: number): TransportBookingDetails {
  return {
    vehicleType: "",
    subType: "",
    vehicleId: null,
    vehicleName: "",
    acType: "AC",
    seats: null,
    legs: buildDefaultLegs(startDate, durationDays),
  };
}

export function TransportBookingEditor({
  travelDateIso,
  durationDays,
  currency,
  vehicles,
  routes,
  routePricing,
  initial,
  onCancel,
  onSave,
}: {
  travelDateIso: string;
  durationDays: number;
  currency: string;
  vehicles: TransportVehicleOption[];
  routes: TransportRouteOption[];
  routePricing: RoutePricingOption[];
  initial: TransportBookingDetails | null;
  onCancel: () => void;
  onSave: (details: TransportBookingDetails, description: string, unitPrice: number) => void;
}) {
  const [draft, setDraft] = useState<TransportBookingDetails>(
    () => initial ?? emptyDraft(travelDateIso, durationDays),
  );

  function patch(fields: Partial<TransportBookingDetails>) {
    setDraft((prev) => ({ ...prev, ...fields }));
  }

  const subTypes = Array.from(new Set(vehicles.filter((v) => v.vehicleType === draft.vehicleType).map((v) => v.subType))).filter(
    Boolean,
  );
  const vehicleOptions = vehicles.filter(
    (v) => (!draft.vehicleType || v.vehicleType === draft.vehicleType) && (!draft.subType || v.subType === draft.subType),
  );

  function selectVehicle(id: string) {
    const vehicle = vehicles.find((v) => v.id === id);
    if (!vehicle) return;
    patch({
      vehicleId: vehicle.id,
      vehicleName: vehicle.title,
      vehicleType: vehicle.vehicleType,
      subType: vehicle.subType,
      acType: vehicle.acType || "AC",
      seats: vehicle.seats,
    });
  }

  function updateLeg(id: string, fields: Partial<TransportLeg>) {
    patch({ legs: draft.legs.map((leg) => (leg.id === id ? { ...leg, ...fields } : leg)) });
  }

  function selectRoute(legId: string, routeId: string) {
    const route = routes.find((r) => r.id === routeId);
    const pricing = draft.vehicleId ? routePricing.find((p) => p.vehicleId === draft.vehicleId && p.routeId === routeId) : null;
    updateLeg(legId, {
      routeId: routeId || null,
      routeName: route?.name ?? "",
      mileageKm: route?.actualDistanceKm ?? 0,
      rate: pricing?.totalPrice ?? 0,
    });
  }

  function addLeg() {
    const lastDate = draft.legs.length > 0 ? draft.legs[draft.legs.length - 1].date : travelDateIso;
    const d = new Date(lastDate);
    d.setUTCDate(d.getUTCDate() + 1);
    patch({
      legs: [
        ...draft.legs,
        {
          id: crypto.randomUUID(),
          routeId: null,
          routeName: "",
          date: d.toISOString().slice(0, 10),
          mileageKm: 0,
          rate: 0,
          extraCost: 0,
        },
      ],
    });
  }

  function removeLeg(id: string) {
    patch({ legs: draft.legs.filter((leg) => leg.id !== id) });
  }

  const total = totalTransportCost(draft.legs);
  const canSave = Boolean(draft.vehicleId) && draft.legs.length > 0;

  function handleSave() {
    const description = `${draft.vehicleName} — ${draft.legs.length} day${draft.legs.length > 1 ? "s" : ""}`;
    onSave(draft, description, total);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transport</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vehicleType">Vehicle Type</Label>
            <Select
              id="vehicleType"
              value={draft.vehicleType}
              onChange={(e) => patch({ vehicleType: e.target.value, subType: "", vehicleId: null, vehicleName: "" })}
            >
              <option value="">-- Select Vehicle Type --</option>
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subType">Select Sub Type</Label>
            <Select
              id="subType"
              value={draft.subType}
              onChange={(e) => patch({ subType: e.target.value, vehicleId: null, vehicleName: "" })}
              disabled={!draft.vehicleType}
            >
              <option value="">-- Select Sub Type --</option>
              {subTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vehicleName">Vehicle Name</Label>
            <Select id="vehicleName" value={draft.vehicleId ?? ""} onChange={(e) => selectVehicle(e.target.value)}>
              <option value="">-- Select Vehicle --</option>
              {vehicleOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acType">AC or NONAC</Label>
            <Select id="acType" value={draft.acType} onChange={(e) => patch({ acType: e.target.value })}>
              {AC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seats">Seats</Label>
            <Input id="seats" value={draft.seats ?? ""} disabled />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label>Transport Route</Label>
            <Button type="button" variant="outline" size="sm" onClick={addLeg}>
              <Plus className="h-3.5 w-3.5" /> Add Day
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {draft.legs.map((leg, index) => (
              <div key={leg.id} className="flex gap-3 rounded-md border border-border p-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                  {index + 1}
                </div>
                <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <div className="flex flex-col gap-1.5 lg:col-span-2">
                    <Label htmlFor={`route-${leg.id}`}>Select Route</Label>
                    <Select id={`route-${leg.id}`} value={leg.routeId ?? ""} onChange={(e) => selectRoute(leg.id, e.target.value)}>
                      <option value="">-- Select Route --</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`date-${leg.id}`}>Start Date</Label>
                    <Input id={`date-${leg.id}`} type="date" value={leg.date} onChange={(e) => updateLeg(leg.id, { date: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`mileage-${leg.id}`}>Mileage (km)</Label>
                    <Input
                      id={`mileage-${leg.id}`}
                      type="number"
                      min={0}
                      value={leg.mileageKm}
                      onChange={(e) => updateLeg(leg.id, { mileageKm: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`rate-${leg.id}`}>Rate</Label>
                    <Input
                      id={`rate-${leg.id}`}
                      type="number"
                      min={0}
                      value={leg.rate}
                      onChange={(e) => updateLeg(leg.id, { rate: Number(e.target.value) || 0 })}
                      className={NO_SPINNER}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`extra-${leg.id}`}>Extra Cost</Label>
                    <Input
                      id={`extra-${leg.id}`}
                      type="number"
                      min={0}
                      value={leg.extraCost}
                      onChange={(e) => updateLeg(leg.id, { extraCost: Number(e.target.value) || 0 })}
                      className={NO_SPINNER}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Total Cost</Label>
                    <Input value={formatCurrency(legTotal(leg), currency)} disabled className={cn("bg-muted", NO_SPINNER)} />
                  </div>
                </div>
                {index > 0 ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    aria-label="Remove day"
                    className="shrink-0 self-start"
                    onClick={() => removeLeg(leg.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="ml-auto flex w-full max-w-xs justify-between border-t border-border pt-1 text-base font-semibold text-foreground">
            <span>Total Cost</span>
            <span>{formatCurrency(total, currency)}</span>
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
