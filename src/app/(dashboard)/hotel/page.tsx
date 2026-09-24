import Link from "next/link";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteHotel } from "@/lib/actions/hotel-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/pagination";
import { formatCurrency } from "@/lib/format";
import { PAGE_SIZE, buildQuery } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

export default async function HotelListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; destination?: string; minStars?: string; page?: string }>;
}) {
  const session = await requireModuleAccess("HOTEL");
  const isAdmin = session.user.role === "ADMIN";
  const params = await searchParams;

  const q = params.q?.trim() ?? "";
  const destination = params.destination?.trim() ?? "";
  const minStars = params.minStars?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.HotelWhereInput = {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(destination ? { destination } : {}),
    ...(minStars ? { starRating: { gte: Number(minStars) } } : {}),
  };

  const [hotels, totalCount, destinations] = await Promise.all([
    prisma.hotel.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.hotel.count({ where }),
    prisma.hotel.findMany({ distinct: ["destination"], select: { destination: true }, orderBy: { destination: "asc" } }),
  ]);

  const filterParams = { q, destination, minStars };
  const hasFilters = Boolean(q || destination || minStars);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Hotels</h1>
          <p className="mt-1 text-sm text-muted-foreground">Catalog of hotel partners and their rates.</p>
        </div>
        {isAdmin ? (
          <Button asChild>
            <Link href="/hotel/new">
              <Plus className="h-4 w-4" /> Add Hotel
            </Link>
          </Button>
        ) : null}
      </div>

      <form action="/hotel" method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="q">Search</Label>
          <Input id="q" name="q" defaultValue={q} placeholder="Hotel name…" className="w-48" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="destination">Destination</Label>
          <Select id="destination" name="destination" defaultValue={destination} className="w-40">
            <option value="">All Destinations</option>
            {destinations.map((d) => (
              <option key={d.destination} value={d.destination}>
                {d.destination}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="minStars">Min Star Rating</Label>
          <Select id="minStars" name="minStars" defaultValue={minStars} className="w-40">
            <option value="">Any</option>
            {[5, 4, 3, 2, 1].map((s) => (
              <option key={s} value={s}>
                {s}+ stars
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" /> Apply
        </Button>
        {hasFilters ? (
          <Button asChild variant="outline">
            <Link href="/hotel">Clear</Link>
          </Button>
        ) : null}
      </form>

      {hotels.length === 0 ? (
        <Card className="items-center justify-center py-16 text-center text-sm text-muted-foreground">
          No hotels found{hasFilters ? " for these filters" : ""}.
        </Card>
      ) : (
        <Card className="gap-0 overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Hotel</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Stars</th>
                <th className="px-4 py-3">Price / night</th>
                <th className="px-4 py-3">Contact</th>
                {isAdmin ? <th className="px-4 py-3 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {hotels.map((hotel) => (
                <tr key={hotel.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{hotel.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{hotel.destination}</td>
                  <td className="px-4 py-3 text-amber-600">{hotel.starRating ? `${hotel.starRating} ★` : "—"}</td>
                  <td className="px-4 py-3 text-foreground">{formatCurrency(hotel.pricePerNight)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {hotel.contactPerson ?? "—"}
                    {hotel.contactPhone ? ` · ${hotel.contactPhone}` : ""}
                  </td>
                  {isAdmin ? (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/hotel/${hotel.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <form action={deleteHotel.bind(null, hotel.id)}>
                          <Button variant="destructive" size="sm" type="submit">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        buildHref={(p) => `/hotel${buildQuery(filterParams, p)}`}
      />
    </div>
  );
}
