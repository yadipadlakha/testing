"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { generateItinerary } from "@/lib/ai/itinerary";
import type { ActionState } from "@/lib/actions/auth-actions";

const tripSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  title: z.string().min(1, "Title is required"),
  destination: z.string().min(1, "Destination is required"),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  travelers: z.coerce.number().int().min(1).default(1),
  budgetAmount: z.coerce.number().min(0).optional().or(z.nan()),
  currency: z.string().min(1).default("USD"),
});

export async function createTrip(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();

  const budgetRaw = formData.get("budgetAmount");
  const parsed = tripSchema.safeParse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    destination: formData.get("destination"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    travelers: formData.get("travelers") || 1,
    budgetAmount: budgetRaw && budgetRaw !== "" ? budgetRaw : undefined,
    currency: formData.get("currency") || "USD",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, agencyId: session.user.agencyId },
    select: { id: true },
  });
  if (!client) {
    return { error: "Client not found" };
  }

  const trip = await prisma.trip.create({
    data: {
      agencyId: session.user.agencyId,
      clientId: parsed.data.clientId,
      ownerId: session.user.id,
      title: parsed.data.title,
      destination: parsed.data.destination,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      travelers: parsed.data.travelers,
      budgetAmount: Number.isNaN(parsed.data.budgetAmount) ? null : parsed.data.budgetAmount,
      currency: parsed.data.currency,
    },
  });

  revalidatePath("/trips");
  revalidatePath(`/clients/${parsed.data.clientId}`);
  redirect(`/trips/${trip.id}`);
}

export async function updateTripStatus(formData: FormData) {
  const session = await requireSession();
  const tripId = String(formData.get("tripId"));
  const status = String(formData.get("status"));

  await prisma.trip.update({
    where: { id: tripId, agencyId: session.user.agencyId },
    data: { status: status as never },
  });

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  revalidatePath("/dashboard");
}

export async function generateTripItinerary(tripId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, agencyId: session.user.agencyId },
  });
  if (!trip) {
    return { error: "Trip not found" };
  }

  const preferences = String(formData.get("preferences") ?? "");

  let generated;
  try {
    generated = await generateItinerary({
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelers: trip.travelers,
      budgetAmount: trip.budgetAmount ? Number(trip.budgetAmount) : null,
      currency: trip.currency,
      preferences,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to generate itinerary" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.itinerary.deleteMany({ where: { tripId } });
    await tx.itinerary.create({
      data: {
        tripId,
        generatedByAi: true,
        prompt: preferences || null,
        summary: generated.summary,
        totalEstimatedCost: generated.totalEstimatedCost ?? null,
        currency: trip.currency,
        days: {
          create: generated.days.map((day) => ({
            dayNumber: day.dayNumber,
            title: day.title,
            location: day.location || null,
            activities: {
              create: day.activities.map((activity) => ({
                order: activity.order,
                startTime: activity.startTime || null,
                title: activity.title,
                description: activity.description || null,
                location: activity.location || null,
                category: activity.category,
                estimatedCost: activity.estimatedCost ?? null,
                currency: trip.currency,
                durationMinutes: activity.durationMinutes ?? null,
              })),
            },
          })),
        },
      },
    });
  });

  revalidatePath(`/trips/${tripId}`);
  return undefined;
}

export async function deleteItinerary(tripId: string) {
  const session = await requireSession();

  const trip = await prisma.trip.findFirst({ where: { id: tripId, agencyId: session.user.agencyId } });
  if (!trip) return;

  await prisma.itinerary.deleteMany({ where: { tripId } });
  revalidatePath(`/trips/${tripId}`);
}
