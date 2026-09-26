"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, MapPin, CalendarDays, Users as UsersIcon } from "lucide-react";
import { createQuotation, updateQuotation } from "@/lib/actions/quotation-actions";
import { QuotationGeneratedAnimation } from "@/components/quotation/quotation-generated-animation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CURRENCIES } from "@/lib/enquiry";
import { computeQuotationTotals } from "@/lib/quotation";
import { buildDayWiseItinerary } from "@/lib/itinerary";
import { TourOverview } from "@/components/quotation/tour-overview";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { HotelBookingSection } from "@/components/quotation/hotel-booking-section";
import { ActivityBookingSection } from "@/components/quotation/activity-booking-section";
import { TransportBookingSection } from "@/components/quotation/transport-booking-section";
import type { HotelBookingDetails } from "@/lib/hotel-booking";
import type { ActivityBookingDetails, ActivityRateBand } from "@/lib/activity-booking";
import type { TransportBookingDetails, RoutePricing } from "@/lib/transport-booking";
import type { QuotationItemCategory } from "@prisma/client";

type ItemDraft = {
  id: string;
  category: QuotationItemCategory;
  description: string;
  quantity: number;
  unitPrice: number;
  details?: unknown;
};

type HotelCatalogEntry = { id: string; name: string; destination: string; address: string | null; currency: string; pricePerNight: number };
type ActivityCatalogEntry = { id: string; name: string; city: string; rates: ActivityRateBand[]; flatPrice: number | null };
type TransportVehicleCatalogEntry = {
  id: string;
  title: string;
  vehicleType: string;
  subType: string;
  acType: string;
  seats: number | null;
};
type TransportRouteCatalogEntry = { id: string; name: string; actualDistanceKm: number | null };
type TransportRoutePricingCatalogEntry = RoutePricing & { vehicleId: string; routeId: string };

type Section = "overview" | "hotels" | "transport" | "activities" | "expenses" | "guide" | "other" | "totals";

const NAV_ITEMS: { section: Section; label: string; group: "SERVICES" | "GENERAL" }[] = [
  { section: "hotels", label: "Hotels", group: "SERVICES" },
  { section: "transport", label: "Transport", group: "SERVICES" },
  { section: "activities", label: "Activities", group: "SERVICES" },
  { section: "expenses", label: "Expenses", group: "SERVICES" },
  { section: "other", label: "Other Services", group: "SERVICES" },
  { section: "guide", label: "Guide", group: "SERVICES" },
  { section: "overview", label: "Overview", group: "GENERAL" },
  { section: "totals", label: "Markup & Totals", group: "GENERAL" },
];

export function QuotationForm({
  mode,
  quotationId,
  enquiryId,
  trip,
  defaultValues,
  catalog,
}: {
  mode: "create" | "edit";
  quotationId?: string;
  enquiryId?: string;
  trip: {
    travelTo: string;
    travelDate: string;
    travelDateIso: string;
    durationDays: number;
    adults: number;
    children: number;
  };
  defaultValues?: {
    title?: string;
    currency?: string;
    validUntil?: string;
    markupPercent?: number;
    discount?: number;
    taxPercent?: number;
    termsAndConditions?: string;
    items?: ItemDraft[];
  };
  catalog: {
    hotels: HotelCatalogEntry[];
    activities: ActivityCatalogEntry[];
    transportVehicles: TransportVehicleCatalogEntry[];
    transportRoutes: TransportRouteCatalogEntry[];
    transportRoutePricing: TransportRoutePricingCatalogEntry[];
  };
}) {
  const action =
    mode === "edit" && quotationId ? updateQuotation.bind(null, quotationId) : createQuotation.bind(null, enquiryId!);
  const [state, formAction] = useActionState(action, undefined);
  const v = defaultValues ?? {};
  const router = useRouter();
  const generatedQuotationId = mode === "create" ? state?.success : undefined;

  const [section, setSection] = useState<Section>("hotels");
  const [items, setItems] = useState<ItemDraft[]>(v.items ?? []);
  const [markupPercent, setMarkupPercent] = useState(v.markupPercent ?? 0);
  const [discount, setDiscount] = useState(v.discount ?? 0);
  const [taxPercent, setTaxPercent] = useState(v.taxPercent ?? 0);
  const [currency, setCurrency] = useState(v.currency ?? "INR");

  function addItem(
    category: QuotationItemCategory,
    description: string,
    quantity: number,
    unitPrice: number,
    details?: unknown,
  ) {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), category, description, quantity, unitPrice, details }]);
  }

  function updateItem(id: string, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const totals = computeQuotationTotals(items, markupPercent, discount, taxPercent);
  const dayWiseItinerary = buildDayWiseItinerary(items, trip.travelDateIso, trip.durationDays);

  function addHotelBooking(description: string, unitPrice: number, details: HotelBookingDetails) {
    addItem("HOTEL", description, 1, unitPrice, details);
  }

  function addActivityBooking(description: string, unitPrice: number, details: ActivityBookingDetails) {
    addItem("SIGHTSEEING", description, 1, unitPrice, details);
  }

  function addTransportBooking(description: string, unitPrice: number, details: TransportBookingDetails) {
    addItem("TRANSPORT", description, 1, unitPrice, details);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="itemsJson" value={JSON.stringify(items)} />

      <Card className="flex-row flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> {trip.travelTo}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" /> {trip.travelDate} · {trip.durationDays} days
          </span>
          <span className="flex items-center gap-1.5">
            <UsersIcon className="h-4 w-4" /> {trip.adults} Adult{trip.adults > 1 ? "s" : ""}
            {trip.children > 0 ? `, ${trip.children} Child${trip.children > 1 ? "ren" : ""}` : ""}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Quotation Amount</p>
          <p className="text-xl font-semibold text-foreground">{formatCurrency(totals.total, currency)}</p>
        </div>
      </Card>

      <div className="flex flex-col gap-6 md:flex-row">
        <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-48 md:flex-col md:overflow-visible">
          <p className="hidden px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:block">
            Services
          </p>
          {NAV_ITEMS.filter((i) => i.group === "SERVICES").map((item) => (
            <button
              key={item.section}
              type="button"
              onClick={() => setSection(item.section)}
              className={cn(
                "shrink-0 rounded-md px-3 py-2 text-left text-sm font-medium",
                section === item.section ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
              )}
            >
              {item.label}
            </button>
          ))}
          <p className="mt-2 hidden px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:block">
            General
          </p>
          {NAV_ITEMS.filter((i) => i.group === "GENERAL").map((item) => (
            <button
              key={item.section}
              type="button"
              onClick={() => setSection(item.section)}
              className={cn(
                "shrink-0 rounded-md px-3 py-2 text-left text-sm font-medium",
                section === item.section ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          <div className={section === "overview" ? "flex flex-col gap-6" : "hidden"}>
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" defaultValue={v.title} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="currency">Currency</Label>
                  <Select id="currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="validUntil">Valid until</Label>
                  <Input id="validUntil" name="validUntil" type="date" defaultValue={v.validUntil} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="termsAndConditions">Terms &amp; conditions</Label>
                  <Textarea
                    id="termsAndConditions"
                    name="termsAndConditions"
                    defaultValue={v.termsAndConditions}
                    rows={5}
                    placeholder="Payment terms, inclusions, exclusions, etc."
                  />
                </div>
              </CardContent>
            </Card>

            <TourOverview days={dayWiseItinerary} />
          </div>

          <div className={section === "hotels" ? "" : "hidden"}>
            <HotelBookingSection
              items={items.filter((i): i is ItemDraft & { category: "HOTEL" } => i.category === "HOTEL")}
              currency={currency}
              travelTo={trip.travelTo}
              travelDateIso={trip.travelDateIso}
              durationDays={trip.durationDays}
              tripAdults={trip.adults}
              tripChildren={trip.children}
              hotels={catalog.hotels}
              onAddItem={addHotelBooking}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
            />
          </div>

          <div className={section === "transport" ? "" : "hidden"}>
            <TransportBookingSection
              items={items.filter((i): i is ItemDraft & { category: "TRANSPORT" } => i.category === "TRANSPORT")}
              currency={currency}
              travelDateIso={trip.travelDateIso}
              durationDays={trip.durationDays}
              vehicles={catalog.transportVehicles}
              routes={catalog.transportRoutes}
              routePricing={catalog.transportRoutePricing}
              onAddItem={addTransportBooking}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
            />
          </div>

          <div className={section === "activities" ? "" : "hidden"}>
            <ActivityBookingSection
              items={items.filter((i): i is ItemDraft & { category: "SIGHTSEEING" } => i.category === "SIGHTSEEING")}
              currency={currency}
              travelTo={trip.travelTo}
              travelDateIso={trip.travelDateIso}
              tripAdults={trip.adults}
              tripChildren={trip.children}
              activities={catalog.activities}
              onAddItem={addActivityBooking}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
            />
          </div>

          <div className={section === "expenses" ? "" : "hidden"}>
            <CustomServiceSection
              title="Expenses"
              category="EXPENSE"
              items={items.filter((i) => i.category === "EXPENSE")}
              currency={currency}
              onAdd={() => addItem("EXPENSE", "", 1, 0)}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
            />
          </div>

          <div className={section === "other" ? "" : "hidden"}>
            <CustomServiceSection
              title="Other Services"
              category="OTHER"
              items={items.filter((i) => i.category === "OTHER")}
              currency={currency}
              onAdd={() => addItem("OTHER", "", 1, 0)}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
            />
          </div>

          <div className={section === "guide" ? "" : "hidden"}>
            <CustomServiceSection
              title="Guide"
              category="GUIDE"
              items={items.filter((i) => i.category === "GUIDE")}
              currency={currency}
              onAdd={() => addItem("GUIDE", "", trip.durationDays, 0)}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
            />
          </div>

          <div className={section === "totals" ? "" : "hidden"}>
            <Card>
              <CardHeader>
                <CardTitle>Markup &amp; totals</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="markupPercent">Markup (%)</Label>
                    <Input
                      id="markupPercent"
                      name="markupPercent"
                      type="number"
                      min={0}
                      value={markupPercent}
                      onChange={(e) => setMarkupPercent(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="discount">Discount (flat amount)</Label>
                    <Input
                      id="discount"
                      name="discount"
                      type="number"
                      min={0}
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="taxPercent">Tax (%)</Label>
                    <Input
                      id="taxPercent"
                      name="taxPercent"
                      type="number"
                      min={0}
                      max={100}
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="ml-auto flex w-full max-w-xs flex-col gap-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(totals.subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Markup</span>
                    <span>+{formatCurrency(totals.markup, currency)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span>-{formatCurrency(totals.afterMarkup - totals.afterDiscount, currency)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span>{formatCurrency(totals.tax, currency)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1 text-base font-semibold text-foreground">
                    <span>Total</span>
                    <span>{formatCurrency(totals.total, currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex justify-end">
        <SubmitButton>{mode === "edit" ? "Save changes" : "Create quotation"}</SubmitButton>
      </div>

      {generatedQuotationId ? (
        <QuotationGeneratedAnimation onDone={() => router.push(`/quotations/${generatedQuotationId}`)} />
      ) : null}
    </form>
  );
}

function CustomServiceSection({
  title,
  items,
  currency,
  onAdd,
  onUpdateItem,
  onRemoveItem,
}: {
  title: string;
  category: QuotationItemCategory;
  items: ItemDraft[];
  currency: string;
  onAdd: () => void;
  onUpdateItem: (id: string, patch: Partial<ItemDraft>) => void;
  onRemoveItem: (id: string) => void;
}) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <span className="text-sm font-medium text-foreground">Subtotal: {formatCurrency(subtotal, currency)}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" /> Add {title.toLowerCase()} item
        </Button>
        <ItemsTable items={items} currency={currency} onUpdate={onUpdateItem} onRemove={onRemoveItem} />
      </CardContent>
    </Card>
  );
}

function ItemsTable({
  items,
  currency,
  onUpdate,
  onRemove,
}: {
  items: ItemDraft[];
  currency: string;
  onUpdate: (id: string, patch: Partial<ItemDraft>) => void;
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No items yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="hidden grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
        <span className="col-span-6">Description</span>
        <span className="col-span-2">Qty</span>
        <span className="col-span-2">Unit price</span>
        <span className="col-span-1 text-right">Total</span>
        <span className="col-span-1" />
      </div>
      {items.map((item) => (
        <div key={item.id} className="grid grid-cols-2 items-center gap-2 rounded-md border border-border p-2 sm:grid-cols-12">
          <Input
            value={item.description}
            onChange={(e) => onUpdate(item.id, { description: e.target.value })}
            placeholder="Description"
            className="col-span-2 sm:col-span-6"
          />
          <Input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => onUpdate(item.id, { quantity: Number(e.target.value) || 1 })}
            className="col-span-1 sm:col-span-2"
          />
          <Input
            type="number"
            min={0}
            value={item.unitPrice}
            onChange={(e) => onUpdate(item.id, { unitPrice: Number(e.target.value) || 0 })}
            className="col-span-1 sm:col-span-2"
          />
          <div className="col-span-1 text-right text-sm font-medium text-foreground sm:col-span-1">
            {formatCurrency(item.quantity * item.unitPrice, currency)}
          </div>
          <div className="col-span-2 flex justify-end sm:col-span-1">
            <Button type="button" variant="destructive" size="icon-sm" onClick={() => onRemove(item.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
