import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { QuoteItem, QuoteTripInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/quotes — list saved quotes.
export async function GET() {
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(quotes);
}

interface CreateBody {
  trip: QuoteTripInput;
  items: QuoteItem[];
  notes?: string;
}

// POST /api/quotes — persist a built quote. The server recomputes the totals
// from the submitted line items so the stored total is authoritative.
export async function POST(req: Request) {
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { trip, items } = body;
  if (!trip?.city || !trip.checkIn || !trip.checkOut) {
    return NextResponse.json(
      { error: "trip.city, checkIn and checkOut are required." },
      { status: 400 },
    );
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "At least one line item is required." },
      { status: 400 },
    );
  }

  const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

  const created = await prisma.quote.create({
    data: {
      title: trip.title || `${trip.city} quote`,
      city: trip.city,
      checkIn: new Date(trip.checkIn),
      checkOut: new Date(trip.checkOut),
      adults: Number(trip.adults) || 2,
      children: Number(trip.children) || 0,
      items: items as unknown as Prisma.InputJsonValue,
      subtotal,
      total: subtotal,
      notes: body.notes || null,
      queryId: trip.queryId || null,
    },
  });

  // Pricing a quote for a query is an explicit "convert" — advance the query
  // if it's still in an early state.
  if (trip.queryId) {
    await prisma.query.updateMany({
      where: {
        id: trip.queryId,
        status: { in: ["NEW_QUERY", "IN_PROGRESS", "ON_HOLD"] },
      },
      data: { status: "CONVERTED" },
    });
  }

  return NextResponse.json(created, { status: 201 });
}
