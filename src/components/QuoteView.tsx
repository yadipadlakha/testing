"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/pricing";
import { QUOTE_STATUS_OPTIONS, type QuoteItem } from "@/lib/types";

export interface QuoteViewProps {
  id: string;
  title: string;
  city: string;
  dateRange: string;
  pax: string;
  status: string;
  currency: string;
  total: number;
  items: QuoteItem[];
}

const kindLabel: Record<string, string> = {
  hotel: "Accommodation",
  transfer: "Transfer",
  activity: "Activity",
};

export default function QuoteView(props: QuoteViewProps) {
  const router = useRouter();
  const [status, setStatus] = useState(props.status);
  const [busy, setBusy] = useState(false);

  async function changeStatus(next: string) {
    const prev = status;
    setStatus(next);
    setBusy(true);
    try {
      const res = await fetch(`/api/quotes/${props.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setStatus(prev);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this quote?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/quotes/${props.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/quotes");
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{props.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {props.city} · {props.dateRange} · {props.pax}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">Status</label>
            <select
              value={status}
              disabled={busy}
              onChange={(e) => changeStatus(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm capitalize focus:border-brand-400 focus:outline-none"
            >
              {QUOTE_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {props.items.map((it, i) => (
              <tr key={i}>
                <td className="px-4 py-3 align-top text-slate-500">
                  {kindLabel[it.kind] ?? it.kind}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{it.label}</div>
                  {it.detail && (
                    <div className="text-xs text-slate-400">{it.detail}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatMoney(it.amount, props.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50">
            <tr>
              <td className="px-4 py-3 font-semibold" colSpan={2}>
                Total ({props.currency}, net)
              </td>
              <td className="px-4 py-3 text-right text-lg font-bold text-brand-700">
                {formatMoney(props.total, props.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleDelete}
          disabled={busy}
          className="rounded-md border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
        >
          Delete quote
        </button>
      </div>
    </div>
  );
}
