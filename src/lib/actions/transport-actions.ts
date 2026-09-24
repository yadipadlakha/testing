"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { parseSpreadsheet, splitList, summarizeBulkUpload, type BulkUploadResult } from "@/lib/bulk-upload";
import { TRIP_TYPES } from "@/lib/transport";

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

const bulkVehicleRowSchema = z.object({
  id: z.string().optional(),
  vehicleType: z.string().min(1, "Vehicle type is required"),
  subType: z.string().optional(),
  acType: z.string().optional(),
  seats: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).optional()),
  vehicleNumber: z.string().optional(),
  tripTypes: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  location: z.string().optional(),
  packagesStarting: z.string().optional(),
  pricePerKm: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  pricePerHour: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  recommendedDriver: z.string().optional(),
  amenities: z.string().optional(),
});

function normalizeTripTypes(value: string | undefined): string[] {
  return splitList(value).map((entry) => {
    const match = TRIP_TYPES.find(
      (t) => t.value.toLowerCase() === entry.toLowerCase() || t.label.toLowerCase() === entry.toLowerCase(),
    );
    return match ? match.value : entry.toUpperCase();
  });
}

export async function bulkUploadVehicles(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV or Excel file to upload." };

  let rows: Record<string, string>[];
  try {
    rows = parseSpreadsheet(await file.arrayBuffer());
  } catch {
    return { error: "Could not read that file. Make sure it's a valid .csv or .xlsx file." };
  }

  const result: BulkUploadResult = { created: 0, updated: 0, skipped: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const parsed = bulkVehicleRowSchema.safeParse({
      id: row["ID"],
      vehicleType: row["Vehicle Type"],
      subType: row["Sub Type"],
      acType: row["AC/NONAC"],
      seats: row["Seats"],
      vehicleNumber: row["Vehicle Number"],
      tripTypes: row["Trip Types"],
      title: row["Title"],
      location: row["Location"],
      packagesStarting: row["Packages Starting"],
      pricePerKm: row["Price Per KM"],
      pricePerHour: row["Price Per Hour"],
      recommendedDriver: row["Recommended Driver"],
      amenities: row["Amenities"],
    });
    if (!parsed.success) {
      result.skipped.push(`Row ${rowNum}: ${parsed.error.issues[0]?.message ?? "invalid data"}`);
      continue;
    }
    const data = parsed.data;

    const values = {
      vehicleType: data.vehicleType,
      subType: data.subType || undefined,
      acType: data.acType?.toUpperCase() === "NONAC" ? "NONAC" : "AC",
      seats: data.seats,
      vehicleNumber: data.vehicleNumber || undefined,
      tripTypes: normalizeTripTypes(data.tripTypes),
      title: data.title,
      location: data.location || undefined,
      packagesStarting: data.packagesStarting || undefined,
      pricePerKm: data.pricePerKm,
      pricePerHour: data.pricePerHour,
      recommendedDriver: data.recommendedDriver || undefined,
      amenities: splitList(data.amenities),
    };

    try {
      if (data.id) {
        await prisma.transport.update({ where: { id: data.id }, data: values });
        result.updated++;
      } else {
        await prisma.transport.create({ data: { ...values, createdById: session.user.id } });
        result.created++;
      }
    } catch {
      result.skipped.push(`Row ${rowNum}: could not save (check the ID exists if updating)`);
    }
  }

  revalidatePath("/transport");
  return summarizeBulkUpload(result);
}
