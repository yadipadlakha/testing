import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuoteView from "@/components/QuoteView";
import type { QuoteItem } from "@/lib/types";

export const dynamic = "force-dynamic";

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function QuoteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const quote = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!quote) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/quotes"
        className="inline-block text-sm text-slate-500 hover:text-slate-700"
      >
        ← Back to quotes
      </Link>

      <QuoteView
        id={quote.id}
        title={quote.title}
        city={quote.city}
        dateRange={`${fmtDate(quote.checkIn)} – ${fmtDate(quote.checkOut)}`}
        pax={`${quote.adults}A${quote.children ? ` ${quote.children}C` : ""}`}
        status={quote.status}
        currency={quote.currency}
        total={Number(quote.total)}
        items={(quote.items as unknown as QuoteItem[]) ?? []}
      />
    </div>
  );
}
