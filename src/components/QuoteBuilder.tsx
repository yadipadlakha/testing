"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/pricing";
import type { QuoteItem } from "@/lib/types";

// ---- API response shapes ----
interface CityOpt { city: string; hotels: number; }
interface HotelOpt { id: string; name: string; city: string; starRating: number | null; currency: string; roomTypes: number; }
interface RoomOpt { id: string; category: string; name: string; mealPlan: string; maxPax: number; }
interface NightLine { date: string; seasonCode: string | null; rate: number | null; }
interface HotelPricing { roomTypeId: string; hotel: string; city: string; currency: string; room: string; nights: number; lines: NightLine[]; subtotal: number; unavailableNights: number; }
interface VehicleOpt { vehicleTypeId: string; name: string; maxPax: number | null; netRate: number; }
interface TransferOpt { id: string; fromLocation: string; toLocation: string; service: string; durationMins: number | null; daySchedule: string | null; vehicles: VehicleOpt[]; }
interface ActivityOpt { id: string; name: string; service: string; description: string | null; childAgeFrom: number | null; childAgeTo: number | null; adultRate: number | null; childRate: number | null; }

interface AddedTransfer { uid: number; transfer: TransferOpt; vehicleTypeId: string; qty: number; }
interface AddedActivity { uid: number; activity: ActivityOpt; adults: number; children: number; }

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400";

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mb-3 text-sm text-slate-500">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

export interface QuoteInitial {
  queryId?: string;
  title?: string;
  city?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
}

export default function QuoteBuilder({ initial }: { initial?: QuoteInitial }) {
  const router = useRouter();
  const uid = useRef(1);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? "");
  const [adults, setAdults] = useState(initial?.adults ?? 2);
  const [children, setChildren] = useState(initial?.children ?? 0);
  const queryId = initial?.queryId;

  const [cities, setCities] = useState<CityOpt[]>([]);
  const [hotels, setHotels] = useState<HotelOpt[]>([]);
  const [rooms, setRooms] = useState<RoomOpt[]>([]);
  const [hotelId, setHotelId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [pricing, setPricing] = useState<HotelPricing | null>(null);
  const [pricingBusy, setPricingBusy] = useState(false);

  const [transfersCat, setTransfersCat] = useState<TransferOpt[]>([]);
  const [activitiesCat, setActivitiesCat] = useState<ActivityOpt[]>([]);
  const [transferQ, setTransferQ] = useState("");
  const [activityQ, setActivityQ] = useState("");
  const [addedTransfers, setAddedTransfers] = useState<AddedTransfer[]>([]);
  const [addedActivities, setAddedActivities] = useState<AddedActivity[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = pricing?.currency || "HKD";

  // Load cities + catalog once. If a destination was prefilled from a query,
  // snap it to the matching catalog city.
  useEffect(() => {
    fetch("/api/catalog/cities")
      .then((r) => r.json())
      .then((cs: CityOpt[]) => {
        setCities(cs);
        if (initial?.city) {
          const match = cs.find(
            (c) => c.city.toLowerCase() === initial.city!.toLowerCase(),
          );
          if (match) setCity(match.city);
        }
      })
      .catch(() => {});
    fetch("/api/catalog/transfers").then((r) => r.json()).then(setTransfersCat).catch(() => {});
    fetch("/api/catalog/activities").then((r) => r.json()).then(setActivitiesCat).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load hotels when city changes.
  useEffect(() => {
    setHotels([]); setHotelId(""); setRooms([]); setRoomId(""); setPricing(null);
    if (!city) return;
    fetch(`/api/catalog/hotels?city=${encodeURIComponent(city)}`)
      .then((r) => r.json()).then(setHotels).catch(() => {});
  }, [city]);

  // Load rooms when hotel changes.
  useEffect(() => {
    setRooms([]); setRoomId(""); setPricing(null);
    if (!hotelId) return;
    fetch(`/api/catalog/hotels/${hotelId}/rooms`)
      .then((r) => r.json()).then(setRooms).catch(() => {});
  }, [hotelId]);

  // Price the stay whenever room + valid dates are set.
  useEffect(() => {
    setPricing(null);
    if (!roomId || !checkIn || !checkOut) return;
    if (new Date(checkOut) <= new Date(checkIn)) return;
    setPricingBusy(true);
    fetch("/api/pricing/hotel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomTypeId: roomId, checkIn, checkOut }),
    })
      .then((r) => r.json())
      .then((d) => setPricing(d.error ? null : d))
      .catch(() => setPricing(null))
      .finally(() => setPricingBusy(false));
  }, [roomId, checkIn, checkOut]);

  const filteredTransfers = useMemo(() => {
    const q = transferQ.toLowerCase();
    return transfersCat
      .filter((t) => t.vehicles.length > 0)
      .filter((t) =>
        !q ||
        `${t.fromLocation} ${t.toLocation} ${t.service}`.toLowerCase().includes(q),
      )
      .slice(0, 25);
  }, [transfersCat, transferQ]);

  const filteredActivities = useMemo(() => {
    const q = activityQ.toLowerCase();
    return activitiesCat
      .filter((a) => a.adultRate != null || a.childRate != null)
      .filter((a) => !q || `${a.name} ${a.service}`.toLowerCase().includes(q))
      .slice(0, 25);
  }, [activitiesCat, activityQ]);

  // ---- line items ----
  const items = useMemo<QuoteItem[]>(() => {
    const out: QuoteItem[] = [];
    if (pricing && pricing.subtotal > 0) {
      out.push({
        kind: "hotel",
        refId: pricing.roomTypeId,
        label: `${pricing.hotel} — ${pricing.room}`,
        detail: `${pricing.nights - pricing.unavailableNights} of ${pricing.nights} night(s) priced`,
        qty: pricing.nights,
        amount: pricing.subtotal,
        meta: { lines: pricing.lines },
      });
    }
    for (const at of addedTransfers) {
      const v = at.transfer.vehicles.find((x) => x.vehicleTypeId === at.vehicleTypeId);
      if (!v) continue;
      out.push({
        kind: "transfer",
        refId: at.transfer.id,
        label: `${at.transfer.fromLocation} → ${at.transfer.toLocation}`,
        detail: `${at.transfer.service} · ${v.name} × ${at.qty}`,
        qty: at.qty,
        unit: v.netRate,
        amount: v.netRate * at.qty,
      });
    }
    for (const aa of addedActivities) {
      const ar = aa.activity.adultRate ?? 0;
      const cr = aa.activity.childRate ?? 0;
      const amount = ar * aa.adults + cr * aa.children;
      out.push({
        kind: "activity",
        refId: aa.activity.id,
        label: aa.activity.name,
        detail: `${aa.adults} adult(s)${aa.children ? `, ${aa.children} child(ren)` : ""}`,
        qty: aa.adults + aa.children,
        amount,
        meta: { adults: aa.adults, children: aa.children, adultRate: ar, childRate: cr },
      });
    }
    return out;
  }, [pricing, addedTransfers, addedActivities]);

  const total = useMemo(() => items.reduce((s, it) => s + it.amount, 0), [items]);

  function addTransfer(t: TransferOpt) {
    setAddedTransfers((prev) => [
      ...prev,
      { uid: uid.current++, transfer: t, vehicleTypeId: t.vehicles[0].vehicleTypeId, qty: 1 },
    ]);
  }
  function addActivity(a: ActivityOpt) {
    setAddedActivities((prev) => [
      ...prev,
      { uid: uid.current++, activity: a, adults, children },
    ]);
  }

  async function save() {
    setError(null);
    if (!city || !checkIn || !checkOut) { setError("Destination and travel dates are required."); return; }
    if (items.length === 0) { setError("Add at least one item (hotel, transfer, or activity)."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip: { title, city, checkIn, checkOut, adults, children, queryId },
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      router.push(`/quotes/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        {/* Trip basics */}
        <Section title="Trip">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Quote title</label>
              <input className={inputClass} placeholder="e.g. Sharma family — Hong Kong" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Destination</label>
              <select className={inputClass} value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">Select destination…</option>
                {cities.map((c) => (
                  <option key={c.city} value={c.city}>{c.city} ({c.hotels})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Adults</label>
                <input type="number" min={1} className={inputClass} value={adults} onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Children</label>
                <input type="number" min={0} className={inputClass} value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Check-in</label>
              <input type="date" className={inputClass} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Check-out</label>
              <input type="date" className={inputClass} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>
        </Section>

        {/* Accommodation */}
        <Section title="Accommodation" subtitle="Rates resolve per night from the contracted seasons.">
          <div className="grid gap-3 sm:grid-cols-2">
            <select className={inputClass} value={hotelId} disabled={!city} onChange={(e) => setHotelId(e.target.value)}>
              <option value="">{city ? "Select hotel…" : "Pick a destination first"}</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>{h.name}{h.starRating ? ` · ${h.starRating}★` : ""}</option>
              ))}
            </select>
            <select className={inputClass} value={roomId} disabled={!hotelId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">{hotelId ? "Select room…" : "Pick a hotel first"}</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name} · {r.mealPlan} · {r.maxPax}P</option>
              ))}
            </select>
          </div>

          {pricingBusy && <p className="mt-3 text-sm text-slate-500">Pricing stay…</p>}
          {pricing && (
            <div className="mt-4">
              {pricing.unavailableNights > 0 && (
                <p className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {pricing.unavailableNights} of {pricing.nights} night(s) have no contracted rate for this room and are excluded.
                </p>
              )}
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs text-slate-500">
                    <tr><th className="px-3 py-2">Night</th><th className="px-3 py-2">Season</th><th className="px-3 py-2 text-right">Rate</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pricing.lines.map((l) => (
                      <tr key={l.date}>
                        <td className="px-3 py-1.5">{l.date}</td>
                        <td className="px-3 py-1.5 text-slate-500">{l.seasonCode ?? "—"}</td>
                        <td className="px-3 py-1.5 text-right">{l.rate != null ? formatMoney(l.rate, currency) : <span className="text-amber-600">n/a</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-medium">
                    <tr><td className="px-3 py-2" colSpan={2}>Accommodation subtotal</td><td className="px-3 py-2 text-right">{formatMoney(pricing.subtotal, currency)}</td></tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </Section>

        {/* Transfers */}
        <Section title="Transfers" subtitle="Add point-to-point transfers; pick a vehicle size.">
          <input className={inputClass} placeholder="Search transfers (e.g. airport, disneyland)…" value={transferQ} onChange={(e) => setTransferQ(e.target.value)} />
          <div className="mt-2 max-h-52 space-y-1 overflow-auto">
            {filteredTransfers.map((t) => (
              <button key={t.id} onClick={() => addTransfer(t)} className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left text-sm hover:border-brand-300 hover:bg-brand-50">
                <span>{t.fromLocation} → {t.toLocation} <span className="text-slate-400">· {t.service}</span></span>
                <span className="text-slate-500">from {formatMoney(t.vehicles[0].netRate, currency)}</span>
              </button>
            ))}
          </div>

          {addedTransfers.length > 0 && (
            <ul className="mt-3 space-y-2">
              {addedTransfers.map((at) => (
                <li key={at.uid} className="flex flex-wrap items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <span className="flex-1">{at.transfer.fromLocation} → {at.transfer.toLocation}</span>
                  <select className="rounded border border-slate-300 px-2 py-1 text-xs" value={at.vehicleTypeId} onChange={(e) => setAddedTransfers((prev) => prev.map((x) => x.uid === at.uid ? { ...x, vehicleTypeId: e.target.value } : x))}>
                    {at.transfer.vehicles.map((v) => (<option key={v.vehicleTypeId} value={v.vehicleTypeId}>{v.name} — {formatMoney(v.netRate, currency)}</option>))}
                  </select>
                  <input type="number" min={1} className="w-16 rounded border border-slate-300 px-2 py-1 text-xs" value={at.qty} onChange={(e) => setAddedTransfers((prev) => prev.map((x) => x.uid === at.uid ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x))} />
                  <button onClick={() => setAddedTransfers((prev) => prev.filter((x) => x.uid !== at.uid))} className="text-rose-500 hover:text-rose-700">✕</button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Activities */}
        <Section title="Activities & tickets" subtitle="Add attractions and tours; set pax per item.">
          <input className={inputClass} placeholder="Search activities (e.g. disney, peak, ocean park)…" value={activityQ} onChange={(e) => setActivityQ(e.target.value)} />
          <div className="mt-2 max-h-52 space-y-1 overflow-auto">
            {filteredActivities.map((a) => (
              <button key={a.id} onClick={() => addActivity(a)} className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left text-sm hover:border-brand-300 hover:bg-brand-50">
                <span>{a.name} <span className="text-slate-400">· {a.service}</span></span>
                <span className="text-slate-500">{a.adultRate != null ? formatMoney(a.adultRate, currency) : "—"}{a.childRate != null ? ` / ${formatMoney(a.childRate, currency)} ch` : ""}</span>
              </button>
            ))}
          </div>

          {addedActivities.length > 0 && (
            <ul className="mt-3 space-y-2">
              {addedActivities.map((aa) => (
                <li key={aa.uid} className="flex flex-wrap items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <span className="flex-1">{aa.activity.name}</span>
                  <label className="text-xs text-slate-500">A</label>
                  <input type="number" min={0} className="w-14 rounded border border-slate-300 px-2 py-1 text-xs" value={aa.adults} onChange={(e) => setAddedActivities((prev) => prev.map((x) => x.uid === aa.uid ? { ...x, adults: Math.max(0, Number(e.target.value) || 0) } : x))} />
                  <label className="text-xs text-slate-500">C</label>
                  <input type="number" min={0} className="w-14 rounded border border-slate-300 px-2 py-1 text-xs" value={aa.children} onChange={(e) => setAddedActivities((prev) => prev.map((x) => x.uid === aa.uid ? { ...x, children: Math.max(0, Number(e.target.value) || 0) } : x))} />
                  <button onClick={() => setAddedActivities((prev) => prev.filter((x) => x.uid !== aa.uid))} className="text-rose-500 hover:text-rose-700">✕</button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* Summary rail */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Quote summary</h2>
          {items.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Add a hotel, transfers, or activities to build the quote.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {items.map((it, i) => (
                <li key={i} className="flex justify-between gap-3 text-sm">
                  <span>
                    <span className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">{it.kind}</span>
                    {it.label}
                    {it.detail && <span className="block text-xs text-slate-400">{it.detail}</span>}
                  </span>
                  <span className="whitespace-nowrap font-medium">{formatMoney(it.amount, currency)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold text-brand-700">{formatMoney(total, currency)}</span>
          </div>
          <p className="mt-1 text-right text-xs text-slate-400">Net contracted rates · {currency}</p>

          {error && <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <button onClick={save} disabled={saving} className="mt-4 w-full rounded-md bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
            {saving ? "Saving…" : "Save quote"}
          </button>
        </div>
      </aside>
    </div>
  );
}
