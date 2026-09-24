"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import type { ActionState } from "@/lib/actions/auth-actions";

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
  price: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
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
      price: data.price,
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
      price: data.price ?? null,
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
