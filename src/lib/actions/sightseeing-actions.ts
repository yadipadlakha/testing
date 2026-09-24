"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import type { ActionState } from "@/lib/actions/auth-actions";
import {
  parseWorkbookSheets,
  splitList,
  summarizeBulkUpload,
  resolveReferenceId,
  type BulkUploadSection,
} from "@/lib/bulk-upload";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

const sightseeingSchema = z.object({
  name: z.string().min(1, "Activity name is required"),
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  starRating: z.preprocess(emptyToUndefined, z.coerce.number().min(0).max(5).optional()),
  duration: z.string().optional(),
  address: z.string().optional(),
  latitude: z.preprocess(emptyToUndefined, z.coerce.number().min(-90).max(90).optional()),
  longitude: z.preprocess(emptyToUndefined, z.coerce.number().min(-180).max(180).optional()),
  contactPhone: z.string().optional(),
  tourSummary: z.string().optional(),
});

function parseActivityTypeIds(formData: FormData): string[] {
  return formData.getAll("activityTypeIds").map(String);
}

export async function createSightseeing(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = sightseeingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const activityTypeIds = parseActivityTypeIds(formData);

  const sightseeing = await prisma.sightseeing.create({
    data: {
      name: data.name,
      country: data.country,
      city: data.city,
      starRating: data.starRating,
      duration: data.duration || undefined,
      address: data.address || undefined,
      latitude: data.latitude,
      longitude: data.longitude,
      contactPhone: data.contactPhone || undefined,
      tourSummary: data.tourSummary || undefined,
      activityTypes: { connect: activityTypeIds.map((id) => ({ id })) },
      createdById: session.user.id,
    },
  });

  revalidatePath("/sightseeing");
  redirect(`/sightseeing/${sightseeing.id}/edit`);
}

export async function updateSightseeing(
  sightseeingId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = sightseeingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const activityTypeIds = parseActivityTypeIds(formData);

  await prisma.sightseeing.update({
    where: { id: sightseeingId },
    data: {
      name: data.name,
      country: data.country,
      city: data.city,
      starRating: data.starRating ?? null,
      duration: data.duration || null,
      address: data.address || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      contactPhone: data.contactPhone || null,
      tourSummary: data.tourSummary || null,
      activityTypes: { set: activityTypeIds.map((id) => ({ id })) },
    },
  });

  revalidatePath("/sightseeing");
  revalidatePath(`/sightseeing/${sightseeingId}/edit`);
  return { success: "Activity details saved." };
}

export async function deleteSightseeing(sightseeingId: string) {
  await requireAdmin();
  await prisma.sightseeing.delete({ where: { id: sightseeingId } });
  revalidatePath("/sightseeing");
}

const activityTypeSchema = z.object({ name: z.string().min(1, "Type name is required") });

export type CreateActivityTypeState = { error?: string; type?: { id: string; name: string } } | undefined;

export async function createActivityType(
  _prevState: CreateActivityTypeState,
  formData: FormData,
): Promise<CreateActivityTypeState> {
  await requireAdmin();
  const parsed = activityTypeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const type = await prisma.sightseeingActivityType.upsert({
    where: { name: parsed.data.name },
    update: {},
    create: { name: parsed.data.name },
  });

  revalidatePath("/sightseeing");
  return { type: { id: type.id, name: type.name } };
}

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const rateSchema = z.object({
  title: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  adultRate: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  minAdult: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  maxAdult: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  childRate: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  minChild: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  maxChild: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  infantRate: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  minInfant: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  maxInfant: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  cancelPolicy: z.string().optional(),
});

export async function addSightseeingRate(
  sightseeingId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = rateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  if (new Date(data.endDate) < new Date(data.startDate)) {
    return { error: "End date must be on or after the start date." };
  }

  const daysOfWeek = DAY_CODES.filter((code) => formData.getAll("daysOfWeek").includes(code));
  if (daysOfWeek.length === 0) {
    return { error: "Select at least one day." };
  }

  await prisma.sightseeingRate.create({
    data: {
      sightseeingId,
      title: data.title || undefined,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      daysOfWeek,
      adultRate: data.adultRate,
      minAdult: data.minAdult,
      maxAdult: data.maxAdult,
      childRate: data.childRate,
      minChild: data.minChild,
      maxChild: data.maxChild,
      infantRate: data.infantRate,
      minInfant: data.minInfant,
      maxInfant: data.maxInfant,
      cancelPolicy: data.cancelPolicy || undefined,
    },
  });

  revalidatePath(`/sightseeing/${sightseeingId}/edit`);
  return { success: "Rate band added — the price calendar below is now updated." };
}

export async function deleteSightseeingRate(sightseeingId: string, rateId: string) {
  await requireAdmin();
  await prisma.sightseeingRate.delete({ where: { id: rateId } });
  revalidatePath(`/sightseeing/${sightseeingId}/edit`);
}

const bulkSightseeingRowSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Activity name is required"),
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  starRating: z.preprocess(emptyToUndefined, z.coerce.number().min(0).max(5).optional()),
  duration: z.string().optional(),
  address: z.string().optional(),
  latitude: z.preprocess(emptyToUndefined, z.coerce.number().min(-90).max(90).optional()),
  longitude: z.preprocess(emptyToUndefined, z.coerce.number().min(-180).max(180).optional()),
  contactPhone: z.string().optional(),
  tourSummary: z.string().optional(),
  price: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  activityTypes: z.string().optional(),
});

const bulkRateRowSchema = z.object({
  activityId: z.string().optional(),
  activityName: z.string().optional(),
  title: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  daysOfWeek: z.string().optional(),
  adultRate: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  minAdult: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  maxAdult: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  childRate: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  minChild: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  maxChild: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  infantRate: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  minInfant: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  maxInfant: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  cancelPolicy: z.string().optional(),
});

async function resolveActivityTypeIds(names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of names) {
    const type = await prisma.sightseeingActivityType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    ids.push(type.id);
  }
  return ids;
}

const DAY_NAMES: Record<string, (typeof DAY_CODES)[number]> = {
  sunday: "SUN",
  monday: "MON",
  tuesday: "TUE",
  wednesday: "WED",
  thursday: "THU",
  friday: "FRI",
  saturday: "SAT",
};

function normalizeDaysOfWeek(value: string | undefined): string[] {
  return splitList(value).map((entry) => {
    const lower = entry.toLowerCase();
    const byName = DAY_NAMES[lower];
    if (byName) return byName;
    const byCode = DAY_CODES.find((code) => code.toLowerCase() === lower || code.toLowerCase().startsWith(lower.slice(0, 3)));
    return byCode ?? entry.toUpperCase();
  });
}

export async function bulkUploadSightseeing(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose the Excel workbook to upload." };

  let sheets: Record<string, Record<string, string>[]>;
  try {
    sheets = parseWorkbookSheets(await file.arrayBuffer());
  } catch {
    return { error: "Could not read that file. Make sure it's the .xlsx template, unmodified in structure." };
  }

  const skipped: string[] = [];
  const activityNameToId = new Map<string, string>();

  const activitySection: BulkUploadSection = { label: "Activities", created: 0, updated: 0 };
  for (const [i, row] of (sheets["Activities"] ?? []).entries()) {
    const rowNum = i + 2;
    const parsed = bulkSightseeingRowSchema.safeParse({
      id: row["ID"],
      name: row["Name"],
      country: row["Country"],
      city: row["City"],
      starRating: row["Star Rating"],
      duration: row["Duration"],
      address: row["Address"],
      latitude: row["Latitude"],
      longitude: row["Longitude"],
      contactPhone: row["Contact Phone"],
      tourSummary: row["Tour Summary"],
      price: row["Price"],
      activityTypes: row["Activity Types"],
    });
    if (!parsed.success) {
      skipped.push(`Activities row ${rowNum}: ${parsed.error.issues[0]?.message ?? "invalid data"}`);
      continue;
    }
    const data = parsed.data;

    try {
      const activityTypeIds = await resolveActivityTypeIds(splitList(data.activityTypes));
      const values = {
        name: data.name,
        country: data.country,
        city: data.city,
        starRating: data.starRating,
        duration: data.duration || undefined,
        address: data.address || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        contactPhone: data.contactPhone || undefined,
        tourSummary: data.tourSummary || undefined,
        price: data.price,
      };

      let id: string;
      if (data.id) {
        const updated = await prisma.sightseeing.update({
          where: { id: data.id },
          data: { ...values, activityTypes: { set: activityTypeIds.map((tid) => ({ id: tid })) } },
        });
        id = updated.id;
        activitySection.updated++;
      } else {
        const created = await prisma.sightseeing.create({
          data: {
            ...values,
            activityTypes: { connect: activityTypeIds.map((tid) => ({ id: tid })) },
            createdById: session.user.id,
          },
        });
        id = created.id;
        activitySection.created++;
      }
      activityNameToId.set(data.name.toLowerCase(), id);
    } catch {
      skipped.push(`Activities row ${rowNum}: could not save (check the ID exists if updating)`);
    }
  }

  const rateSection: BulkUploadSection = { label: "Price Calendar", created: 0, updated: 0 };
  for (const [i, row] of (sheets["Price Calendar"] ?? []).entries()) {
    const rowNum = i + 2;
    const parsed = bulkRateRowSchema.safeParse({
      activityId: row["Activity ID (optional)"] || row["Activity ID"],
      activityName: row["Activity Name"],
      title: row["Title"],
      startDate: row["Start Date"],
      endDate: row["End Date"],
      daysOfWeek: row["Days Of Week"],
      adultRate: row["Adult Rate"],
      minAdult: row["Min Adult"],
      maxAdult: row["Max Adult"],
      childRate: row["Child Rate"],
      minChild: row["Min Child"],
      maxChild: row["Max Child"],
      infantRate: row["Infant Rate"],
      minInfant: row["Min Infant"],
      maxInfant: row["Max Infant"],
      cancelPolicy: row["Cancel Policy"],
    });
    if (!parsed.success) {
      skipped.push(`Price Calendar row ${rowNum}: ${parsed.error.issues[0]?.message ?? "invalid data"}`);
      continue;
    }
    const data = parsed.data;

    if (new Date(data.endDate) < new Date(data.startDate)) {
      skipped.push(`Price Calendar row ${rowNum}: end date must be on or after the start date`);
      continue;
    }
    const daysOfWeek = normalizeDaysOfWeek(data.daysOfWeek);
    if (daysOfWeek.length === 0) {
      skipped.push(`Price Calendar row ${rowNum}: select at least one day`);
      continue;
    }

    const activityRef = await resolveReferenceId(data.activityId, data.activityName, activityNameToId, (name) =>
      prisma.sightseeing.findMany({ where: { name: { equals: name, mode: "insensitive" } }, select: { id: true } }),
    );
    if ("error" in activityRef) {
      skipped.push(`Price Calendar row ${rowNum}: activity ${activityRef.error}`);
      continue;
    }

    try {
      await prisma.sightseeingRate.create({
        data: {
          sightseeingId: activityRef.id,
          title: data.title || undefined,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          daysOfWeek,
          adultRate: data.adultRate,
          minAdult: data.minAdult,
          maxAdult: data.maxAdult,
          childRate: data.childRate,
          minChild: data.minChild,
          maxChild: data.maxChild,
          infantRate: data.infantRate,
          minInfant: data.minInfant,
          maxInfant: data.maxInfant,
          cancelPolicy: data.cancelPolicy || undefined,
        },
      });
      rateSection.created++;
    } catch {
      skipped.push(`Price Calendar row ${rowNum}: could not save`);
    }
  }

  revalidatePath("/sightseeing");
  return summarizeBulkUpload([activitySection, rateSection], skipped);
}
