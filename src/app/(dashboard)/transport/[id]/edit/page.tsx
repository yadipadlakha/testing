import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { VehicleForm } from "@/components/transport/vehicle-form";
import { RoutePricingManager } from "@/components/transport/route-pricing-manager";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [vehicle, allRoutes] = await Promise.all([
    prisma.transport.findUnique({
      where: { id },
      include: { routePricing: { include: { route: true }, orderBy: { createdAt: "asc" } } },
    }),
    prisma.transportRoute.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!vehicle) notFound();

  const pricedRouteIds = new Set(vehicle.routePricing.map((p) => p.routeId));
  const availableRoutes = allRoutes.filter((route) => !pricedRouteIds.has(route.id));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit Vehicle</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update vehicle details and manage route-wise pricing.</p>
      </div>

      <VehicleForm
        mode="edit"
        vehicleId={vehicle.id}
        defaultValues={{
          vehicleType: vehicle.vehicleType,
          subType: vehicle.subType ?? "",
          acType: vehicle.acType,
          seats: vehicle.seats ?? "",
          vehicleNumber: vehicle.vehicleNumber ?? "",
          tripTypes: vehicle.tripTypes,
          title: vehicle.title,
          location: vehicle.location ?? "",
          packagesStarting: vehicle.packagesStarting ?? "",
          recommendedDriver: vehicle.recommendedDriver ?? "",
          amenities: vehicle.amenities,
        }}
      />

      <RoutePricingManager
        transportId={vehicle.id}
        availableRoutes={availableRoutes.map((r) => ({ id: r.id, name: r.name }))}
        pricing={vehicle.routePricing.map((p) => ({
          id: p.id,
          routeName: p.route.name,
          pricePerKm: p.pricePerKm,
          nightCharge: p.nightCharge,
          tollTax: p.tollTax,
          driverAllowance: p.driverAllowance,
          totalPrice: p.totalPrice,
        }))}
      />
    </div>
  );
}
