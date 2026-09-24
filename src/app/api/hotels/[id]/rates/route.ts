import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getModulePermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permissions = await getModulePermissions(session.user.id, session.user.role);
  if (session.user.role !== "ADMIN" && !permissions.has("ENQUIRY") && !permissions.has("HOTEL")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const hotel = await prisma.hotel.findUnique({
    where: { id },
    include: {
      seasons: {
        include: { roomRates: true, extraRates: true },
        orderBy: { startDate: "asc" },
      },
    },
  });
  if (!hotel) return NextResponse.json({ error: "Hotel not found" }, { status: 404 });

  return NextResponse.json({
    hotel: {
      id: hotel.id,
      name: hotel.name,
      address: hotel.address,
      destination: hotel.destination,
      currency: hotel.currency,
    },
    seasons: hotel.seasons.map((s) => ({ id: s.id, name: s.name, startDate: s.startDate, endDate: s.endDate })),
    roomRates: hotel.seasons.flatMap((s) =>
      s.roomRates.map((r) => ({
        seasonId: s.id,
        roomCategory: r.roomCategory,
        roomType: r.roomType,
        mealPlan: r.mealPlan,
        pax: r.pax,
        rate: r.rate,
      })),
    ),
    extraRates: hotel.seasons.flatMap((s) => s.extraRates.map((e) => ({ seasonId: s.id, label: e.label, rate: e.rate }))),
  });
}
