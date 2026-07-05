import QuoteBuilder from "@/components/QuoteBuilder";

export const dynamic = "force-dynamic";

export default function NewQuotePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Quote</h1>
        <p className="text-sm text-slate-500">
          Build an itemized price from contracted hotel, transfer, and activity
          rates.
        </p>
      </div>
      <QuoteBuilder />
    </div>
  );
}
