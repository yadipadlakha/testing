"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CURRENCIES, formatDate } from "@/lib/enquiry";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  HOTEL_BOOKING_STATUSES,
  splitCities,
  hotelMatchesCity,
  addDays,
  nightsBetween,
  datesInRange,
  nightlyRate,
  defaultExtraPrices,
  computeHotelBookingTotals,
  type HotelBookingDetails,
  type HotelBookingStatus,
} from "@/lib/hotel-booking";

const WEEKDAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type HotelOption = { id: string; name: string; destination: string; address: string | null; currency: string };
type RatesResponse = {
  hotel: { id: string };
  seasons: { id: string; name: string; startDate: string; endDate: string }[];
  roomRates: { seasonId: string; roomCategory: string; roomType: string; mealPlan: string; rate: number }[];
  extraRates: { seasonId: string; label: string; rate: number }[];
};

function emptyDraft(currency: string): HotelBookingDetails {
  return {
    city: "",
    hotelId: null,
    hotelName: "",
    hotelAddress: "",
    alternateHotelId: null,
    alternateHotelName: null,
    currency,
    status: "AVAILABLE",
    confirmationNumber: "",
    specialRequests: "",
    rateMode: "INVENTORY",
    roomCategory: "",
    roomType: "",
    mealPlan: "",
    checkIn: "",
    checkOut: "",
    numberOfRooms: 1,
    totalPax: 1,
    extraBedAdultQty: 0,
    extraBedAdultPrice: 0,
    extraBedChildQty: 0,
    extraBedChildPrice: 0,
    noBedChildQty: 0,
    noBedChildPrice: 0,
    infantQty: 0,
    infantPrice: 0,
    additionalChargesDescription: "",
    additionalChargesAmount: 0,
    roomSubTotal: 0,
    totalCost: 0,
  };
}

export function HotelBookingEditor({
  travelTo,
  travelDateIso,
  durationDays,
  tripAdults,
  tripChildren,
  hotels,
  initial,
  onCancel,
  onSave,
}: {
  travelTo: string;
  travelDateIso: string;
  durationDays: number;
  tripAdults: number;
  tripChildren: number;
  hotels: HotelOption[];
  initial: HotelBookingDetails | null;
  onCancel: () => void;
  onSave: (details: HotelBookingDetails, description: string, unitPrice: number) => void;
}) {
  const [step, setStep] = useState<"details" | "room">("details");
  const [draft, setDraft] = useState<HotelBookingDetails>(
    () => initial ?? { ...emptyDraft("INR"), totalPax: tripAdults + tripChildren || 1 },
  );
  const [alternateEnabled, setAlternateEnabled] = useState(Boolean(initial?.alternateHotelId));
  const [bookingOpen, setBookingOpen] = useState(false);
  const [rates, setRates] = useState<RatesResponse | null>(null);
  const ratesLoading = Boolean(draft.hotelId) && rates?.hotel.id !== draft.hotelId;

  const cities = useMemo(() => splitCities(travelTo), [travelTo]);
  const hotelOptions = useMemo(() => {
    if (!draft.city) return hotels;
    const filtered = hotels.filter((h) => hotelMatchesCity(h.destination, draft.city));
    return filtered.length > 0 ? filtered : hotels;
  }, [hotels, draft.city]);

  useEffect(() => {
    if (!draft.hotelId) return;
    fetch(`/api/hotels/${draft.hotelId}/rates`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setRates(data))
      .catch(() => setRates(null));
  }, [draft.hotelId]);

  function patch(fields: Partial<HotelBookingDetails>) {
    setDraft((prev) => ({ ...prev, ...fields }));
  }

  function selectHotel(id: string) {
    const hotel = hotels.find((h) => h.id === id);
    if (!hotel) return;
    patch({
      hotelId: hotel.id,
      hotelName: hotel.name,
      hotelAddress: hotel.address ?? "",
      currency: hotel.currency,
      roomCategory: "",
      roomType: "",
      mealPlan: "",
      checkIn: "",
      checkOut: "",
    });
  }

  function selectAlternate(id: string) {
    const hotel = hotels.find((h) => h.id === id);
    patch({ alternateHotelId: id || null, alternateHotelName: hotel?.name ?? null });
  }

  const roomCategories = useMemo(() => {
    if (!rates) return [];
    return [...new Set(rates.roomRates.map((r) => r.roomCategory))];
  }, [rates]);
  const roomTypes = useMemo(() => {
    if (!rates || !draft.roomCategory) return [];
    return [...new Set(rates.roomRates.filter((r) => r.roomCategory === draft.roomCategory).map((r) => r.roomType))];
  }, [rates, draft.roomCategory]);
  const mealPlans = useMemo(() => {
    if (!rates || !draft.roomCategory || !draft.roomType) return [];
    return [
      ...new Set(
        rates.roomRates
          .filter((r) => r.roomCategory === draft.roomCategory && r.roomType === draft.roomType)
          .map((r) => r.mealPlan),
      ),
    ];
  }, [rates, draft.roomCategory, draft.roomType]);

  const [windowOffset, setWindowOffset] = useState(0);
  const tileWindow = useMemo(
    () => datesInRange(addDays(addDays(travelDateIso, -1), windowOffset), durationDays + 4),
    [travelDateIso, durationDays, windowOffset],
  );

  function tilePrice(date: string): number | null {
    if (draft.rateMode !== "INVENTORY" || !rates || !draft.roomCategory || !draft.roomType || !draft.mealPlan) return null;
    return nightlyRate(rates.seasons, rates.roomRates, date, draft.roomCategory, draft.roomType, draft.mealPlan);
  }

  function clickTile(date: string) {
    if (!draft.checkIn || (draft.checkIn && draft.checkOut)) {
      patch({ checkIn: date, checkOut: "" });
      return;
    }
    if (date === draft.checkIn) {
      patch({ checkIn: "", checkOut: "" });
      return;
    }
    if (date < draft.checkIn) {
      patch({ checkIn: date, checkOut: "" });
      return;
    }
    const checkOut = date;
    const extras = rates ? defaultExtraPrices(rates.seasons, rates.extraRates, draft.checkIn) : null;
    patch({
      checkOut,
      ...(extras
        ? {
            extraBedAdultPrice: extras.extraBedAdult,
            extraBedChildPrice: extras.extraBedChild,
            noBedChildPrice: extras.noBedChild,
          }
        : {}),
    });
  }

  const nights = draft.checkIn && draft.checkOut ? nightsBetween(draft.checkIn, draft.checkOut) : 0;
  const nightDates = nights > 0 ? datesInRange(draft.checkIn, nights) : [];
  const nightlyPrices =
    draft.rateMode === "INVENTORY"
      ? nightDates.map((d) => tilePrice(d) ?? 0)
      : nightDates.map(() => draft.manualNightlyPrice ?? 0);
  const hasMissingRate = draft.rateMode === "INVENTORY" && nightDates.some((d) => tilePrice(d) == null);
  const totals = computeHotelBookingTotals(draft, nightlyPrices);

  function handleSave() {
    const finalDraft: HotelBookingDetails = {
      ...draft,
      roomSubTotal: totals.roomSubTotal,
      totalCost: totals.totalCost,
    };
    const roomLabel =
      draft.rateMode === "INVENTORY"
        ? `${draft.roomCategory}${draft.roomType && draft.roomType !== draft.roomCategory ? ` (${draft.roomType})` : ""}, ${draft.mealPlan}`
        : `${draft.roomCategory || "Room"}${draft.mealPlan ? `, ${draft.mealPlan}` : ""} (manual)`;
    const description = `${draft.hotelName} — ${roomLabel}, ${nights} night${nights === 1 ? "" : "s"} × ${draft.numberOfRooms} room${draft.numberOfRooms === 1 ? "" : "s"}`;
    onSave(finalDraft, description, totals.totalCost);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{step === "details" ? "Hotel" : `Hotel — ${draft.hotelName}`}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {step === "details" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Select City</Label>
              <div className="flex flex-wrap gap-2">
                {cities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => patch({ city })}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm",
                      draft.city === city ? "border-primary bg-primary/5 text-foreground" : "border-border text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-3.5 w-3.5 rounded-full border",
                        draft.city === city ? "border-primary bg-primary" : "border-border",
                      )}
                    />
                    {city}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hotelCityName">City Name</Label>
                <Input id="hotelCityName" value={draft.city} disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hotelName">Hotel Name</Label>
                <Select value={draft.hotelId ?? ""} onChange={(e) => selectHotel(e.target.value)} id="hotelName">
                  <option value="">-- Select Hotel --</option>
                  {hotelOptions.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hotelAddress">Hotel Address</Label>
                <Input id="hotelAddress" value={draft.hotelAddress} disabled />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label>Alternate Hotel</Label>
                <label className="flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={alternateEnabled}
                    onChange={(e) => {
                      setAlternateEnabled(e.target.checked);
                      if (!e.target.checked) patch({ alternateHotelId: null, alternateHotelName: null });
                    }}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  {alternateEnabled ? (
                    <select
                      value={draft.alternateHotelId ?? ""}
                      onChange={(e) => selectAlternate(e.target.value)}
                      className="w-full bg-transparent text-sm outline-none"
                    >
                      <option value="">Select Alternate Hotel</option>
                      {hotelOptions
                        .filter((h) => h.id !== draft.hotelId)
                        .map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <span className="text-muted-foreground">Select Alternate Hotel</span>
                  )}
                </label>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hotelCurrency">Currency</Label>
                <Select id="hotelCurrency" value={draft.currency} onChange={(e) => patch({ currency: e.target.value })}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hotelStatus">Hotel Status</Label>
                <Select
                  id="hotelStatus"
                  value={draft.status}
                  onChange={(e) => patch({ status: e.target.value as HotelBookingStatus })}
                >
                  {HOTEL_BOOKING_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setBookingOpen((o) => !o)}
                className="flex items-center gap-1 text-sm font-medium text-primary"
              >
                {bookingOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Booking &amp; Confirmation
              </button>
              {bookingOpen ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="confirmationNumber">Confirmation Number</Label>
                    <Input
                      id="confirmationNumber"
                      value={draft.confirmationNumber}
                      onChange={(e) => patch({ confirmationNumber: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="specialRequests">Special Requests</Label>
                    <Textarea
                      id="specialRequests"
                      value={draft.specialRequests}
                      onChange={(e) => patch({ specialRequests: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Close
              </Button>
              <Button type="button" disabled={!draft.hotelId} onClick={() => setStep("room")}>
                Next
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Rate Sourcing Mode</Label>
              <div className="inline-flex w-fit rounded-md border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => patch({ rateMode: "INVENTORY" })}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium",
                    draft.rateMode === "INVENTORY" ? "bg-primary text-primary-foreground" : "text-foreground",
                  )}
                >
                  Inventory
                </button>
                <button
                  type="button"
                  onClick={() => patch({ rateMode: "MANUAL" })}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium",
                    draft.rateMode === "MANUAL" ? "bg-primary text-primary-foreground" : "text-foreground",
                  )}
                >
                  Manual
                </button>
              </div>
            </div>

            {draft.rateMode === "INVENTORY" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="roomCategory">Room Category</Label>
                    <Select
                      id="roomCategory"
                      value={draft.roomCategory}
                      onChange={(e) => patch({ roomCategory: e.target.value, roomType: "", mealPlan: "" })}
                      disabled={ratesLoading || roomCategories.length === 0}
                    >
                      <option value="">-- Select --</option>
                      {roomCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="roomType">Room Type</Label>
                    <Select
                      id="roomType"
                      value={draft.roomType}
                      onChange={(e) => patch({ roomType: e.target.value, mealPlan: "" })}
                      disabled={roomTypes.length === 0}
                    >
                      <option value="">-- Select --</option>
                      {roomTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="mealPlan">Meal Plan</Label>
                    <Select
                      id="mealPlan"
                      value={draft.mealPlan}
                      onChange={(e) => patch({ mealPlan: e.target.value })}
                      disabled={mealPlans.length === 0}
                    >
                      <option value="">-- Select --</option>
                      {mealPlans.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {ratesLoading ? <p className="text-sm text-muted-foreground">Loading rates…</p> : null}
                {!ratesLoading && rates && roomCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    This hotel has no imported rates yet. Use Manual mode, or import its rate sheet from the Hotel list.
                  </p>
                ) : null}

                {draft.roomCategory && draft.roomType && draft.mealPlan ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Select Date Range</Label>
                      <div className="flex gap-1">
                        <Button type="button" variant="outline" size="icon-sm" onClick={() => setWindowOffset((o) => o - 7)}>
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="outline" size="icon-sm" onClick={() => setWindowOffset((o) => o + 7)}>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {tileWindow.map((date) => {
                        const price = tilePrice(date);
                        const selected =
                          draft.checkIn && draft.checkOut
                            ? date >= draft.checkIn && date <= draft.checkOut
                            : date === draft.checkIn;
                        const d = new Date(date);
                        return (
                          <button
                            key={date}
                            type="button"
                            disabled={price == null}
                            onClick={() => clickTile(date)}
                            className={cn(
                              "flex shrink-0 flex-col items-center rounded-md border px-3 py-2 text-xs",
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : price == null
                                  ? "border-border text-muted-foreground opacity-50"
                                  : "border-border text-foreground hover:bg-muted",
                            )}
                          >
                            <span>{WEEKDAY_NAMES[d.getUTCDay()]}</span>
                            <span className="font-semibold">
                              {d.getUTCDate()} {MONTH_NAMES[d.getUTCMonth()]}
                            </span>
                            <span>{price != null ? formatCurrency(price, draft.currency) : "—"}</span>
                          </button>
                        );
                      })}
                    </div>
                    {!ratesLoading && rates && tileWindow.every((date) => tilePrice(date) == null) ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                        <p>No rates available for this room in the dates shown. Use the arrows above to browse to a covered period.</p>
                        {rates.seasons.length > 0 ? (
                          <p className="mt-1">
                            Available seasons:{" "}
                            {rates.seasons
                              .map((s) => `${s.name} (${formatDate(s.startDate)} – ${formatDate(s.endDate)})`)
                              .join(", ")}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {hasMissingRate ? (
                      <p className="text-xs text-amber-600">
                        Some selected nights have no rate available and are counted as {formatCurrency(0, draft.currency)}.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="manualRoomCategory">Room Category</Label>
                  <Input
                    id="manualRoomCategory"
                    value={draft.roomCategory}
                    onChange={(e) => patch({ roomCategory: e.target.value })}
                    placeholder="e.g. Deluxe"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="manualMealPlan">Meal Plan</Label>
                  <Input
                    id="manualMealPlan"
                    value={draft.mealPlan}
                    onChange={(e) => patch({ mealPlan: e.target.value })}
                    placeholder="e.g. Breakfast"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="manualCheckIn">Check-in</Label>
                  <Input
                    id="manualCheckIn"
                    type="date"
                    value={draft.checkIn}
                    onChange={(e) => patch({ checkIn: e.target.value, checkOut: "" })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="manualCheckOut">Check-out</Label>
                  <Input
                    id="manualCheckOut"
                    type="date"
                    value={draft.checkOut}
                    min={draft.checkIn || undefined}
                    onChange={(e) => patch({ checkOut: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="manualNightlyPrice">Price Per Night</Label>
                  <Input
                    id="manualNightlyPrice"
                    type="number"
                    min={0}
                    value={draft.manualNightlyPrice ?? ""}
                    onChange={(e) => patch({ manualNightlyPrice: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
            )}

            <Card className="gap-3 bg-muted/30 p-4">
              <p className="text-sm font-semibold text-foreground">Price Summary</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Number of Rooms</Label>
                  <Input
                    type="number"
                    min={1}
                    value={draft.numberOfRooms}
                    onChange={(e) => patch({ numberOfRooms: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Total Pax</Label>
                  <Input
                    type="number"
                    min={1}
                    value={draft.totalPax}
                    onChange={(e) => patch({ totalPax: Number(e.target.value) || 1 })}
                  />
                </div>
                <div />
                <ExtraField
                  label="Extra Bed (Adult)"
                  currency={draft.currency}
                  qty={draft.extraBedAdultQty}
                  price={draft.extraBedAdultPrice}
                  onQty={(v) => patch({ extraBedAdultQty: v })}
                  onPrice={(v) => patch({ extraBedAdultPrice: v })}
                />
                <ExtraField
                  label="Extra Bed (Child)"
                  currency={draft.currency}
                  qty={draft.extraBedChildQty}
                  price={draft.extraBedChildPrice}
                  onQty={(v) => patch({ extraBedChildQty: v })}
                  onPrice={(v) => patch({ extraBedChildPrice: v })}
                />
                <ExtraField
                  label="No Bed (Child)"
                  currency={draft.currency}
                  qty={draft.noBedChildQty}
                  price={draft.noBedChildPrice}
                  onQty={(v) => patch({ noBedChildQty: v })}
                  onPrice={(v) => patch({ noBedChildPrice: v })}
                />
                <ExtraField
                  label="Infant"
                  currency={draft.currency}
                  qty={draft.infantQty}
                  price={draft.infantPrice}
                  onQty={(v) => patch({ infantQty: v })}
                  onPrice={(v) => patch({ infantPrice: v })}
                />
              </div>

              <div className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Number of Nights</span>
                  <span className="text-foreground">{nights}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sub Total</span>
                  <span className="text-foreground">{formatCurrency(totals.roomSubTotal, draft.currency)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Additional Charges</span>
                  <Input
                    value={draft.additionalChargesDescription}
                    onChange={(e) => patch({ additionalChargesDescription: e.target.value })}
                    placeholder="Additional Charges Description"
                    className="h-8 flex-1"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={draft.additionalChargesAmount}
                    onChange={(e) => patch({ additionalChargesAmount: Number(e.target.value) || 0 })}
                    className="h-8 w-28"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
                  <span>Total Cost</span>
                  <span>{formatCurrency(totals.totalCost, draft.currency)}</span>
                </div>
              </div>
            </Card>

            <div className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("details")}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Close
                </Button>
                <Button type="button" disabled={nights === 0} onClick={handleSave}>
                  Save changes
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ExtraField({
  label,
  currency,
  qty,
  price,
  onQty,
  onPrice,
}: {
  label: string;
  currency: string;
  qty: number;
  price: number;
  onQty: (v: number) => void;
  onPrice: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1">
        <Input type="number" min={0} value={qty} onChange={(e) => onQty(Number(e.target.value) || 0)} className="w-16" />
        <div className="flex flex-1 items-center gap-1">
          <span className="text-xs text-muted-foreground">{currency}</span>
          <Input type="number" min={0} value={price} onChange={(e) => onPrice(Number(e.target.value) || 0)} />
        </div>
      </div>
    </div>
  );
}
