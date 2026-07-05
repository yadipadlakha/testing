import { prisma } from "@/lib/prisma";
import { renderQuotePdf } from "@/lib/pdf/QuoteDoc";
import type { QuoteItem } from "@/lib/types";

export const runtime = "nodejs";

function fmt(d: Date): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// GET /api/quotes/:id/pdf — branded client-facing PDF quotation.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { query: { select: { guestName: true, salutation: true, salesTeam: true } } },
  });
  if (!quote) {
    return new Response(JSON.stringify({ error: "Not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const guest = quote.query
    ? `${quote.query.salutation ? quote.query.salutation + " " : ""}${quote.query.guestName}`
    : undefined;

  const reference = `QT-${quote.id.slice(-6).toUpperCase()}`;

  const pdf = await renderQuotePdf({
    reference,
    title: quote.title,
    city: quote.city,
    dateRange: `${fmt(quote.checkIn)} – ${fmt(quote.checkOut)}`,
    pax: `${quote.adults} Adult${quote.adults > 1 ? "s" : ""}${
      quote.children ? ` · ${quote.children} Child${quote.children > 1 ? "ren" : ""}` : ""
    }`,
    status: quote.status,
    currency: quote.currency,
    total: Number(quote.total),
    guestName: guest,
    salesTeam: quote.query?.salesTeam,
    dateStr: fmt(quote.createdAt),
    items: (quote.items as unknown as QuoteItem[]) ?? [],
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${reference}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
