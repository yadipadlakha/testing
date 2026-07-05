import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma, QueryStatus } from "@prisma/client";
import { QUERY_STATUSES, type QueryInput } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = new Set<string>(QUERY_STATUSES.map((s) => s.value));

// GET /api/queries?status=IN_PROGRESS — list, optionally filtered by status.
// Employees only get their own assigned queries; admins get everything.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where: Prisma.QueryWhereInput = {
    ...(isAdmin(user.roles) ? {} : { assigneeId: user.id }),
    ...(status && status !== "ALL" && VALID.has(status)
      ? { status: status as QueryStatus }
      : {}),
  };

  const queries = await prisma.query.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { assignee: { select: { name: true } } },
  });
  return NextResponse.json(queries);
}

// POST /api/queries — create a new query (enters at NEW_QUERY).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: QueryInput & { assigneeId?: string | null };
  try {
    body = (await req.json()) as QueryInput & { assigneeId?: string | null };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.guestName || !body.guestName.trim()) {
    return NextResponse.json(
      { error: "Guest name is required." },
      { status: 400 },
    );
  }

  // Admins may assign to anyone (or leave unassigned); employees always own the
  // queries they create.
  const assigneeId = isAdmin(user.roles)
    ? body.assigneeId?.trim() || null
    : user.id;

  const created = await prisma.query.create({
    data: {
      source: body.source?.trim() || null,
      referenceId: body.referenceId?.trim() || null,
      salesTeam: body.salesTeam?.trim() || "You",
      assigneeId,
      tags: Array.isArray(body.tags) ? body.tags : [],
      destinations: Array.isArray(body.destinations) ? body.destinations : [],
      startDate: body.startDate ? new Date(body.startDate) : null,
      nights: Math.max(1, Number(body.nights) || 1),
      adults: Math.max(1, Number(body.adults) || 1),
      childAges: Array.isArray(body.childAges)
        ? body.childAges.map((a) => Number(a) || 0)
        : [],
      totalFoc: Math.max(0, Number(body.totalFoc) || 0),
      salutation: body.salutation?.trim() || null,
      guestName: body.guestName.trim(),
      phones: (Array.isArray(body.phones)
        ? body.phones.filter((p) => p.number?.trim())
        : []) as unknown as Prisma.InputJsonValue,
      email: body.email?.trim() || null,
      location: body.location?.trim() || null,
      comments: body.comments?.trim() || null,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
