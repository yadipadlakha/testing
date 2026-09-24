"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createQuotation, updateQuotation } from "@/lib/actions/quotation-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CURRENCIES } from "@/lib/enquiry";
import { computeQuotationTotals, QUOTATION_CATEGORY_LABELS } from "@/lib/quotation";
import { formatCurrency } from "@/lib/format";
import type { QuotationItemCategory } from "@prisma/client";

type ItemDraft = {
  id: string;
  category: QuotationItemCategory;
  description: string;
  quantity: number;
  unitPrice: number;
};

type CatalogEntry = { id: string; label: string; unitPrice: number };

export function QuotationForm({
  mode,
  quotationId,
  enquiryId,
  defaultValues,
  catalog,
}: {
  mode: "create" | "edit";
  quotationId?: string;
  enquiryId?: string;
  defaultValues?: {
    title?: string;
    currency?: string;
    validUntil?: string;
    discount?: number;
    taxPercent?: number;
    termsAndConditions?: string;
    items?: ItemDraft[];
  };
  catalog: { hotels: CatalogEntry[]; sightseeing: CatalogEntry[]; transport: CatalogEntry[] };
}) {
  const action =
    mode === "edit" && quotationId ? updateQuotation.bind(null, quotationId) : createQuotation.bind(null, enquiryId!);
  const [state, formAction] = useActionState(action, undefined);
  const v = defaultValues ?? {};

  const [items, setItems] = useState<ItemDraft[]>(v.items ?? []);
  const [discount, setDiscount] = useState(v.discount ?? 0);
  const [taxPercent, setTaxPercent] = useState(v.taxPercent ?? 0);
  const [currency, setCurrency] = useState(v.currency ?? "INR");

  function addItem(category: QuotationItemCategory, description: string, unitPrice: number) {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), category, description, quantity: 1, unitPrice }]);
  }

  function updateItem(id: string, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const totals = computeQuotationTotals(items, discount, taxPercent);

  function handleCatalogAdd(category: QuotationItemCategory, list: CatalogEntry[], selectId: string) {
    const entry = list.find((e) => e.id === selectId);
    if (entry) addItem(category, entry.label, entry.unitPrice);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="itemsJson" value={JSON.stringify(items)} />

      <Card>
        <CardHeader>
          <CardTitle>Quotation details</CardTitle>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <CatalogPicker
              label="Add hotel"
              entries={catalog.hotels}
              onAdd={(id) => handleCatalogAdd("HOTEL", catalog.hotels, id)}
            />
            <CatalogPicker
              label="Add sightseeing"
              entries={catalog.sightseeing}
              onAdd={(id) => handleCatalogAdd("SIGHTSEEING", catalog.sightseeing, id)}
            />
            <CatalogPicker
              label="Add transport"
              entries={catalog.transport}
              onAdd={(id) => handleCatalogAdd("TRANSPORT", catalog.transport, id)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => addItem("OTHER", "", 0)}
          >
            <Plus className="h-3.5 w-3.5" /> Add custom item
          </Button>

          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No items yet. Add one above.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="hidden grid-cols-12 gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
                <span className="col-span-2">Category</span>
                <span className="col-span-5">Description</span>
                <span className="col-span-1">Qty</span>
                <span className="col-span-2">Unit price</span>
                <span className="col-span-1 text-right">Total</span>
                <span className="col-span-1" />
              </div>
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-2 items-center gap-2 rounded-md border border-border p-2 sm:grid-cols-12">
                  <Select
                    value={item.category}
                    onChange={(e) => updateItem(item.id, { category: e.target.value as QuotationItemCategory })}
                    className="col-span-2 sm:col-span-2"
                  >
                    {Object.entries(QUOTATION_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    placeholder="Description"
                    className="col-span-2 sm:col-span-5"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) || 1 })}
                    className="col-span-1 sm:col-span-1"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) || 0 })}
                    className="col-span-1 sm:col-span-2"
                  />
                  <div className="col-span-1 text-right text-sm font-medium text-foreground sm:col-span-1">
                    {formatCurrency(item.quantity * item.unitPrice, currency)}
                  </div>
                  <div className="col-span-1 flex justify-end sm:col-span-1">
                    <Button type="button" variant="destructive" size="icon-sm" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
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
              <span>Discount</span>
              <span>-{formatCurrency(totals.subtotal - totals.afterDiscount, currency)}</span>
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

      <Card>
        <CardHeader>
          <CardTitle>Terms &amp; conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            name="termsAndConditions"
            defaultValue={v.termsAndConditions}
            rows={5}
            placeholder="Payment terms, inclusions, exclusions, etc."
          />
        </CardContent>
      </Card>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex justify-end">
        <SubmitButton>{mode === "edit" ? "Save changes" : "Create quotation"}</SubmitButton>
      </div>
    </form>
  );
}

function CatalogPicker({
  label,
  entries,
  onAdd,
}: {
  label: string;
  entries: CatalogEntry[];
  onAdd: (id: string) => void;
}) {
  const [selected, setSelected] = useState("");
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="flex-1">
          <option value="">-- Select --</option>
          {entries.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!selected}
          onClick={() => {
            onAdd(selected);
            setSelected("");
          }}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
