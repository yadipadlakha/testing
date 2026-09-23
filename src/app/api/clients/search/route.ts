import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getModulePermissions } from "@/lib/permissions";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ clients: [] }, { status: 401 });
  }

  const permissions = await getModulePermissions(session.user.id, session.user.role);
  if (session.user.role !== "ADMIN" && !permissions.has("ENQUIRY")) {
    return NextResponse.json({ clients: [] }, { status: 403 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3) {
    return NextResponse.json({ clients: [] });
  }

  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { companyName: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: 8,
  });

  return NextResponse.json({ clients });
}
