"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import type { ActionState } from "@/lib/actions/auth-actions";

async function getOwnedTrip(tripId: string, agencyId: string) {
  return prisma.trip.findFirst({ where: { id: tripId, agencyId } });
}

export async function createManualItinerary(tripId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const trip = await getOwnedTrip(tripId, session.user.agencyId);
  if (!trip) return { error: "Trip not found" };

  const summary = String(formData.get("summary") ?? "").trim();

  await prisma.itinerary.upsert({
    where: { tripId },
    update: {},
    create: {
      tripId,
      generatedByAi: false,
      summary: summary || "Manually built itinerary.",
      currency: trip.currency,
    },
  });

  revalidatePath(`/trips/${tripId}`);
  return undefined;
}

const daySchema = z.object({
  title: z.string().min(1, "Day title is required"),
  location: z.string().optional().or(z.literal("")),
});

export async function addItineraryDay(tripId: string, itineraryId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const trip = await getOwnedTrip(tripId, session.user.agencyId);
  if (!trip) return { error: "Trip not found" };

  const parsed = daySchema.safeParse({ title: formData.get("title"), location: formData.get("location") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const itinerary = await prisma.itinerary.findFirst({ where: { id: itineraryId, tripId } });
  if (!itinerary) return { error: "Itinerary not found" };

  const lastDay = await prisma.itineraryDay.findFirst({ where: { itineraryId }, orderBy: { dayNumber: "desc" } });

  await prisma.itineraryDay.create({
    data: {
      itineraryId,
      dayNumber: (lastDay?.dayNumber ?? 0) + 1,
      title: parsed.data.title,
      location: parsed.data.location || null,
    },
  });

  revalidatePath(`/trips/${tripId}`);
  return undefined;
}

export async function deleteItineraryDay(tripId: string, dayId: string) {
  const session = await requireSession();
  const trip = await getOwnedTrip(tripId, session.user.agencyId);
  if (!trip) return;

  await prisma.itineraryDay.deleteMany({ where: { id: dayId, itinerary: { tripId } } });
  revalidatePath(`/trips/${tripId}`);
}

const activitySchema = z.object({
  title: z.string().min(1, "Activity title is required"),
  startTime: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  category: z.enum(["SIGHTSEEING", "FOOD", "TRANSPORT", "ACCOMMODATION", "ACTIVITY", "FREE_TIME"]),
  estimatedCost: z.coerce.number().min(0).optional().or(z.nan()),
  durationMinutes: z.coerce.number().int().min(0).optional().or(z.nan()),
});

export async function addItineraryActivity(tripId: string, dayId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const trip = await getOwnedTrip(tripId, session.user.agencyId);
  if (!trip) return { error: "Trip not found" };

  const parsed = activitySchema.safeParse({
    title: formData.get("title"),
    startTime: formData.get("startTime"),
    description: formData.get("description"),
    location: formData.get("location"),
    category: formData.get("category"),
    estimatedCost: formData.get("estimatedCost") || undefined,
    durationMinutes: formData.get("durationMinutes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const day = await prisma.itineraryDay.findFirst({ where: { id: dayId, itinerary: { tripId } } });
  if (!day) return { error: "Day not found" };

  const lastActivity = await prisma.itineraryActivity.findFirst({
    where: { itineraryDayId: dayId },
    orderBy: { order: "desc" },
  });

  await prisma.itineraryActivity.create({
    data: {
      itineraryDayId: dayId,
      order: (lastActivity?.order ?? 0) + 1,
      startTime: parsed.data.startTime || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      location: parsed.data.location || null,
      category: parsed.data.category,
      estimatedCost: Number.isNaN(parsed.data.estimatedCost) ? null : parsed.data.estimatedCost,
      currency: trip.currency,
      durationMinutes: Number.isNaN(parsed.data.durationMinutes) ? null : parsed.data.durationMinutes,
    },
  });

  revalidatePath(`/trips/${tripId}`);
  return undefined;
}

export async function deleteItineraryActivity(tripId: string, activityId: string) {
  const session = await requireSession();
  const trip = await getOwnedTrip(tripId, session.user.agencyId);
  if (!trip) return;

  await prisma.itineraryActivity.deleteMany({ where: { id: activityId, day: { itinerary: { tripId } } } });
  revalidatePath(`/trips/${tripId}`);
}
