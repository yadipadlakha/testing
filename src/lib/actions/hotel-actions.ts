"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import type { ActionState } from "@/lib/actions/auth-actions";
import { parseHotelImportCsv } from "@/lib/hotel-import";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

const hotelSchema = z.object({
  name: z.string().min(1, "Hotel name is required"),
  destination: z.string().min(1, "Destination is required"),
  starRating: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(5).optional()),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.union([z.literal(""), z.string().email()]).optional(),
  pricePerNight: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  notes: z.string().optional(),
});

export async function createHotel(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = hotelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  await prisma.hotel.create({
    data: {
      name: data.name,
      destination: data.destination,
      starRating: data.starRating,
      address: data.address || undefined,
      contactPerson: data.contactPerson || undefined,
      contactPhone: data.contactPhone || undefined,
      contactEmail: data.contactEmail || undefined,
      pricePerNight: data.pricePerNight,
      notes: data.notes || undefined,
      createdById: session.user.id,
    },
  });

  revalidatePath("/hotel");
  redirect("/hotel");
}

export async function updateHotel(hotelId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = hotelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      name: data.name,
      destination: data.destination,
      starRating: data.starRating ?? null,
      address: data.address || null,
      contactPerson: data.contactPerson || null,
      contactPhone: data.contactPhone || null,
      contactEmail: data.contactEmail || null,
      pricePerNight: data.pricePerNight ?? null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/hotel");
  redirect("/hotel");
}

export async function deleteHotel(hotelId: string) {
  await requireAdmin();
  await prisma.hotel.delete({ where: { id: hotelId } });
  revalidatePath("/hotel");
}

export async function importHotelProperties(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();

  const file = formData.get("file");
  const currency = String(formData.get("currency") ?? "").trim();
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to upload." };
  if (!currency) return { error: "Select a currency for the imported rates." };

  let properties;
  try {
    properties = parseHotelImportCsv(await file.arrayBuffer());
  } catch {
    return { error: "Could not read that file. Make sure it's a valid .csv rate sheet." };
  }
  if (properties.length === 0) {
    return { error: "No properties found in that file. Make sure it follows the rate-sheet template." };
  }

  let created = 0;
  let updated = 0;
  const skipped: string[] = [];

  for (const property of properties) {
    if (!property.name || !property.country) {
      skipped.push(`"${property.name || "Unnamed property"}": missing name or country`);
      continue;
    }
    if (property.seasons.length === 0) {
      skipped.push(`"${property.name}": no valid season date ranges found`);
      continue;
    }

    const allRates = [...property.roomRates.map((r) => r.rate), ...property.extraRates.map((r) => r.rate)];
    const minRate = allRates.length > 0 ? Math.min(...allRates) : undefined;

    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.hotel.findFirst({ where: { name: { equals: property.name, mode: "insensitive" } } });

        const hotel = existing
          ? await tx.hotel.update({
              where: { id: existing.id },
              data: {
                destination: property.country,
                starRating: property.starRating ?? existing.starRating,
                currency,
                pricePerNight: minRate ?? existing.pricePerNight,
              },
            })
          : await tx.hotel.create({
              data: {
                name: property.name,
                destination: property.country,
                starRating: property.starRating,
                currency,
                pricePerNight: minRate,
                createdById: session.user.id,
              },
            });

        if (existing) {
          await tx.hotelSeason.deleteMany({ where: { hotelId: hotel.id } });
        }

        const seasonIdByName = new Map<string, string>();
        for (const season of property.seasons) {
          const createdSeason = await tx.hotelSeason.create({
            data: { hotelId: hotel.id, name: season.name, startDate: season.startDate, endDate: season.endDate },
          });
          seasonIdByName.set(season.name, createdSeason.id);
        }

        const roomRateRows = property.roomRates
          .filter((r) => seasonIdByName.has(r.seasonName))
          .map((r) => ({
            hotelId: hotel.id,
            seasonId: seasonIdByName.get(r.seasonName)!,
            roomCategory: r.roomCategory,
            roomType: r.roomType,
            mealPlan: r.mealPlan,
            pax: r.pax,
            rate: r.rate,
          }));
        if (roomRateRows.length > 0) await tx.hotelRoomRate.createMany({ data: roomRateRows });

        const extraRateRows = property.extraRates
          .filter((r) => seasonIdByName.has(r.seasonName))
          .map((r) => ({
            hotelId: hotel.id,
            seasonId: seasonIdByName.get(r.seasonName)!,
            label: r.label,
            rate: r.rate,
          }));
        if (extraRateRows.length > 0) await tx.hotelExtraRate.createMany({ data: extraRateRows });

        if (existing) updated++;
        else created++;
      });
    } catch {
      skipped.push(`"${property.name}": could not save`);
    }
  }

  revalidatePath("/hotel");

  if (created === 0 && updated === 0) {
    return { error: skipped.length ? `No properties were imported. ${skipped.join(" · ")}` : "No properties were imported." };
  }
  let success = `Import complete: ${created} added, ${updated} updated.`;
  if (skipped.length > 0) success += ` ${skipped.length} skipped — ${skipped.join(" · ")}`;
  return { success };
}

export async function deleteHotelSeason(hotelId: string, seasonId: string) {
  await requireAdmin();
  await prisma.hotelSeason.delete({ where: { id: seasonId } });
  revalidatePath(`/hotel/${hotelId}/edit`);
}
