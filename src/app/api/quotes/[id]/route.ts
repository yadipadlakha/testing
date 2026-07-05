import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QUOTE_STATUS_OPTIONS } from "@/lib/types";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

type Params = { params: { id: string } };

// GET /api/quotes/:id
export async function GET(_req: Request, { params }: Params) {
  const quote = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!quote) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(quote);
}

interface PatchBody {
  status?: string;
  title?: string;
  notes?: string;
}

// PATCH /api/quotes/:id
export async function PATCH(req: Request, { params }: Params) {
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    body.status !== undefined &&
    !QUOTE_STATUS_OPTIONS.includes(
      body.status as (typeof QUOTE_STATUS_OPTIONS)[number],
    )
  ) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const data: Prisma.QuoteUpdateInput = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.title !== undefined) data.title = body.title;
  if (body.notes !== undefined) data.notes = body.notes;

  try {
    const updated = await prisma.quote.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}

// DELETE /api/quotes/:id
export async function DELETE(_req: Request, { params }: Params) {
  try {
    await prisma.quote.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
