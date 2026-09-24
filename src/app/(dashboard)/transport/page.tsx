import Link from "next/link";
import { Plus, Upload, Pencil, Trash2, Search } from "lucide-react";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteVehicle } from "@/lib/actions/transport-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/pagination";
import { TransportTabs } from "@/components/transport/transport-tabs";
import { VEHICLE_TYPES, AC_TYPES, TRIP_TYPES, tripTypeLabel } from "@/lib/transport";
import { formatCurrency } from "@/lib/format";
import { PAGE_SIZE, buildQuery } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

export default async function TransportListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; vehicleType?: string; acType?: string; location?: string; tripType?: string; page?: string }>;
}) {
  const session = await requireModuleAccess("TRANSPORT");
  const isAdmin = session.user.role === "ADMIN";
  const params = await searchParams;

  const q = params.q?.trim() ?? "";
  const vehicleType = params.vehicleType?.trim() ?? "";
  const acType = params.acType?.trim() ?? "";
  const location = params.location?.trim() ?? "";
  const tripType = params.tripType?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.TransportWhereInput = {
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    ...(vehicleType ? { vehicleType } : {}),
    ...(acType ? { acType } : {}),
    ...(location ? { location } : {}),
    ...(tripType ? { tripTypes: { has: tripType } } : {}),
  };

  const [vehicles, totalCount, locations] = await Promise.all([
    prisma.transport.findMany({
      where,
      include: { _count: { select: { routePricing: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.transport.count({ where }),
    prisma.transport.findMany({
      distinct: ["location"],
      select: { location: true },
      where: { location: { not: null } },
      orderBy: { location: "asc" },
    }),
  ]);

  const filterParams = { q, vehicleType, acType, location, tripType };
  const hasFilters = Boolean(q || vehicleType || acType || location || tripType);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Transport</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vehicle fleet and route pricing.</p>
        </div>
        {isAdmin ? (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/transport/bulk-upload">
                <Upload className="h-4 w-4" /> Bulk Upload
              </Link>
            </Button>
            <Button asChild>
              <Link href="/transport/new">
                <Plus className="h-4 w-4" /> Add Vehicle
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <TransportTabs active="vehicles" />

      <form action="/transport" method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="q">Search</Label>
          <Input id="q" name="q" defaultValue={q} placeholder="Vehicle title…" className="w-48" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vehicleType">Vehicle Type</Label>
          <Select id="vehicleType" name="vehicleType" defaultValue={vehicleType} className="w-40">
            <option value="">All Types</option>
            {VEHICLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="acType">AC / NONAC</Label>
          <Select id="acType" name="acType" defaultValue={acType} className="w-32">
            <option value="">Any</option>
            {AC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="location">Location</Label>
          <Select id="location" name="location" defaultValue={location} className="w-40">
            <option value="">All Locations</option>
            {locations.map((l) => (
              <option key={l.location} value={l.location ?? ""}>
                {l.location}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tripType">Trip Type</Label>
          <Select id="tripType" name="tripType" defaultValue={tripType} className="w-36">
            <option value="">All Trips</option>
            {TRIP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" /> Apply
        </Button>
        {hasFilters ? (
          <Button asChild variant="outline">
            <Link href="/transport">Clear</Link>
          </Button>
        ) : null}
      </form>

      {vehicles.length === 0 ? (
        <Card className="items-center justify-center py-16 text-center text-sm text-muted-foreground">
          No vehicles found{hasFilters ? " for these filters" : ""}.
        </Card>
      ) : (
        <Card className="gap-0 overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Seats</th>
                <th className="px-4 py-3">Trip Types</th>
                <th className="px-4 py-3">Pricing</th>
                <th className="px-4 py-3">Routes priced</th>
                {isAdmin ? <th className="px-4 py-3 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{vehicle.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {vehicle.vehicleType}
                      {vehicle.subType ? ` · ${vehicle.subType}` : ""} · {vehicle.acType}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{vehicle.location ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{vehicle.seats ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {vehicle.tripTypes.map((t) => (
                        <Badge key={t} variant="outline">
                          {tripTypeLabel(t)}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {vehicle.pricePerKm ? `${formatCurrency(vehicle.pricePerKm)}/km` : ""}
                    {vehicle.pricePerKm && vehicle.pricePerHour ? " · " : ""}
                    {vehicle.pricePerHour ? `${formatCurrency(vehicle.pricePerHour)}/hr` : ""}
                    {!vehicle.pricePerKm && !vehicle.pricePerHour ? "—" : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{vehicle._count.routePricing}</td>
                  {isAdmin ? (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/transport/${vehicle.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <form action={deleteVehicle.bind(null, vehicle.id)}>
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
        buildHref={(p) => `/transport${buildQuery(filterParams, p)}`}
      />
    </div>
  );
}
