import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma, QueryStatus, User } from "@prisma/client";
import { QUERY_TRANSITIONS, type QueryStatusValue } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";

export const runtime = "nodejs";

type Params = { params: { id: string } };

// An employee may only act on queries assigned to them; admins on any.
function canAccess(user: User, assigneeId: string | null): boolean {
  return isAdmin(user.roles) || assigneeId === user.id;
}

// GET /api/queries/:id — the query plus any linked quotes.
export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = await prisma.query.findUnique({
    where: { id: params.id },
    include: {
      assignee: { select: { id: true, name: true } },
      quotes: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, status: true, total: true, currency: true },
      },
    },
  });
  if (!query) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!canAccess(user, query.assigneeId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(query);
}

interface PatchBody {
  status?: QueryStatusValue;
  salesTeam?: string;
  comments?: string;
  assigneeId?: string | null;
}

// PATCH /api/queries/:id — advance the lifecycle or edit a couple of fields.
export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const current = await prisma.query.findUnique({ where: { id: params.id } });
  if (!current) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!canAccess(user, current.assigneeId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data: Prisma.QueryUpdateInput = {};

  if (body.status !== undefined) {
    const allowed = QUERY_TRANSITIONS[current.status as QueryStatusValue] ?? [];
    if (body.status !== current.status && !allowed.includes(body.status)) {
      return NextResponse.json(
        {
          error: `Cannot move from ${current.status} to ${body.status}.`,
          allowed,
        },
        { status: 409 },
      );
    }
    data.status = body.status as QueryStatus;
  }
  if (body.salesTeam !== undefined) data.salesTeam = body.salesTeam;
  if (body.comments !== undefined) data.comments = body.comments;
  // Only admins may (re)assign a query to another employee.
  if (body.assigneeId !== undefined && isAdmin(user.roles)) {
    data.assignee = body.assigneeId
      ? { connect: { id: body.assigneeId } }
      : { disconnect: true };
  }

  const updated = await prisma.query.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}

// DELETE /api/queries/:id
export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const current = await prisma.query.findUnique({ where: { id: params.id } });
  if (!current) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!canAccess(user, current.assigneeId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.query.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
