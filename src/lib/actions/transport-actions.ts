"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import type { ActionState } from "@/lib/actions/auth-actions";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

const vehicleSchema = z.object({
  vehicleType: z.string().min(1, "Vehicle type is required"),
  subType: z.string().optional(),
  acType: z.enum(["AC", "NONAC"]),
  seats: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).optional()),
  vehicleNumber: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  location: z.string().optional(),
  packagesStarting: z.string().optional(),
  pricePerKm: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  pricePerHour: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  recommendedDriver: z.string().optional(),
});

function parseListField(formData: FormData, name: string): string[] {
  return formData.getAll(name).map(String).filter(Boolean);
}

export async function createVehicle(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const vehicle = await prisma.transport.create({
    data: {
      vehicleType: data.vehicleType,
      subType: data.subType || undefined,
      acType: data.acType,
      seats: data.seats,
      vehicleNumber: data.vehicleNumber || undefined,
      tripTypes: parseListField(formData, "tripTypes"),
      title: data.title,
      location: data.location || undefined,
      packagesStarting: data.packagesStarting || undefined,
      pricePerKm: data.pricePerKm,
      pricePerHour: data.pricePerHour,
      recommendedDriver: data.recommendedDriver || undefined,
      amenities: parseListField(formData, "amenities"),
      createdById: session.user.id,
    },
  });

  revalidatePath("/transport");
  redirect(`/transport/${vehicle.id}/edit`);
}

export async function updateVehicle(
  vehicleId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  await prisma.transport.update({
    where: { id: vehicleId },
    data: {
      vehicleType: data.vehicleType,
      subType: data.subType || null,
      acType: data.acType,
      seats: data.seats ?? null,
      vehicleNumber: data.vehicleNumber || null,
      tripTypes: parseListField(formData, "tripTypes"),
      title: data.title,
      location: data.location || null,
      packagesStarting: data.packagesStarting || null,
      pricePerKm: data.pricePerKm ?? null,
      pricePerHour: data.pricePerHour ?? null,
      recommendedDriver: data.recommendedDriver || null,
      amenities: parseListField(formData, "amenities"),
    },
  });

  revalidatePath("/transport");
  revalidatePath(`/transport/${vehicleId}/edit`);
  return { success: "Vehicle details saved." };
}

export async function deleteVehicle(vehicleId: string) {
  await requireAdmin();
  await prisma.transport.delete({ where: { id: vehicleId } });
  revalidatePath("/transport");
}

const routeSchema = z.object({
  name: z.string().min(1, "Route name is required"),
  itineraryText: z.string().min(1, "Itinerary text is required"),
  actualDistanceKm: z.coerce.number().int().min(0, "Actual distance is required"),
  displayDistanceKm: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  itineraryDurationHours: z.coerce.number().int().min(0, "Itinerary duration is required"),
});

export async function createRoute(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = routeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const destinations = parseListField(formData, "destinations");
  if (destinations.length === 0) return { error: "Add at least one destination." };
  const activityIds = parseListField(formData, "activityIds");

  await prisma.transportRoute.create({
    data: {
      name: data.name,
      destinations,
      itineraryText: data.itineraryText,
      actualDistanceKm: data.actualDistanceKm,
      displayDistanceKm: data.displayDistanceKm,
      itineraryDurationHours: data.itineraryDurationHours,
      activities: { connect: activityIds.map((id) => ({ id })) },
      createdById: session.user.id,
    },
  });

  revalidatePath("/transport/routes");
  redirect("/transport/routes");
}

export async function updateRoute(
  routeId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = routeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const destinations = parseListField(formData, "destinations");
  if (destinations.length === 0) return { error: "Add at least one destination." };
  const activityIds = parseListField(formData, "activityIds");

  await prisma.transportRoute.update({
    where: { id: routeId },
    data: {
      name: data.name,
      destinations,
      itineraryText: data.itineraryText,
      actualDistanceKm: data.actualDistanceKm,
      displayDistanceKm: data.displayDistanceKm ?? null,
      itineraryDurationHours: data.itineraryDurationHours,
      activities: { set: activityIds.map((id) => ({ id })) },
    },
  });

  revalidatePath("/transport/routes");
  redirect("/transport/routes");
}

export async function deleteRoute(routeId: string) {
  await requireAdmin();
  await prisma.transportRoute.delete({ where: { id: routeId } });
  revalidatePath("/transport/routes");
}

const routePricingSchema = z.object({
  routeId: z.string().min(1, "Select a route"),
  pricePerKm: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  nightCharge: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  tollTax: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  driverAllowance: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  totalPrice: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
});

export async function addRoutePricing(
  transportId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = routePricingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const existing = await prisma.transportRoutePricing.findUnique({
    where: { transportId_routeId: { transportId, routeId: data.routeId } },
  });
  if (existing) return { error: "This vehicle already has pricing for that route. Delete it first to replace." };

  await prisma.transportRoutePricing.create({
    data: {
      transportId,
      routeId: data.routeId,
      pricePerKm: data.pricePerKm,
      nightCharge: data.nightCharge,
      tollTax: data.tollTax,
      driverAllowance: data.driverAllowance,
      totalPrice: data.totalPrice,
    },
  });

  revalidatePath(`/transport/${transportId}/edit`);
  return { success: "Route pricing added." };
}

export async function deleteRoutePricing(transportId: string, routePricingId: string) {
  await requireAdmin();
  await prisma.transportRoutePricing.delete({ where: { id: routePricingId } });
  revalidatePath(`/transport/${transportId}/edit`);
}
