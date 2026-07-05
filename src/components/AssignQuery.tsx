"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AssignQuery({
  queryId,
  current,
  employees,
}: {
  queryId: string;
  current: string | null;
  employees: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: string) {
    setValue(next);
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/queries/${queryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: next || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not assign.");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-2 font-semibold text-slate-900">Assignment</h2>
      <p className="mb-2 text-xs text-slate-500">
        The assigned employee sees this query in their portal.
      </p>
      <select
        value={value}
        disabled={busy}
        onChange={(e) => save(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        <option value="">Unassigned</option>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      {saved && <p className="mt-2 text-xs text-emerald-600">Saved ✓</p>}
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
