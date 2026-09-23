"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { generateItinerary } from "@/lib/ai/itinerary";
import type { ActionState } from "@/lib/actions/auth-actions";

const ENQUIRY_TYPE_VALUES = ["INDIVIDUAL", "FAMILY", "GROUP", "CORPORATE", "HONEYMOON"] as const;
const SERVICE_TYPE_VALUES = [
  "FLIGHT",
  "HOTEL",
  "VISA",
  "PACKAGE",
  "TRANSPORT",
  "CRUISE",
  "ACTIVITY",
  "INSURANCE",
  "TRAIN",
] as const;
const FLIGHT_CLASS_VALUES = ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"] as const;
const HOTEL_TYPE_VALUES = ["BUDGET", "STANDARD", "DELUXE", "LUXURY"] as const;
const VEHICLE_TYPE_VALUES = ["NONE", "SEDAN", "SUV", "VAN", "COACH", "LUXURY_CAR"] as const;

const optionalText = () => z.string().optional().or(z.literal(""));
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.enum(values), z.literal("")]).optional();

const enquirySchema = z.object({
  agentId: z.string().min(1, "Agent is required"),
  agentAsTraveler: z.boolean().default(false),
  companyName: optionalText(),
  customerName: z.string().min(1, "Customer name is required"),
  mobile: z.string().min(1, "Mobile is required"),
  whatsapp: optionalText(),
  email: z.string().email("Enter a valid email"),
  city: z.string().min(1, "City is required"),
  country: optionalText(),
  address: optionalText(),
  enquiryType: z.enum(ENQUIRY_TYPE_VALUES),
  services: z.array(z.enum(SERVICE_TYPE_VALUES)).min(1, "Select at least one service"),
  travelDate: z.string().min(1, "Travel date is required"),
  numDays: z.coerce.number().int().min(1, "Number of days is required"),
  travelFrom: z.string().min(1, "Travel from is required"),
  destination: z.string().min(1, "Destination is required"),
  currency: z.string().min(1).default("USD"),
  budgetAmount: z.coerce.number().min(0).optional().or(z.nan()),
  flightClass: optionalEnum(FLIGHT_CLASS_VALUES),
  hotelType: optionalEnum(HOTEL_TYPE_VALUES),
  vehicleType: optionalEnum(VEHICLE_TYPE_VALUES),
  travelers: z.coerce.number().int().min(1).default(1),
  nationality: z.string().min(1, "Nationality is required"),
  comment: z.string().min(1, "Comment is required"),
});

export async function createEnquiry(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();

  const budgetRaw = formData.get("budgetAmount");
  const parsed = enquirySchema.safeParse({
    agentId: formData.get("agentId"),
    agentAsTraveler: formData.get("agentAsTraveler") === "on",
    companyName: formData.get("companyName"),
    customerName: formData.get("customerName"),
    mobile: formData.get("mobile"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email"),
    city: formData.get("city"),
    country: formData.get("country"),
    address: formData.get("address"),
    enquiryType: formData.get("enquiryType"),
    services: formData.getAll("services"),
    travelDate: formData.get("travelDate"),
    numDays: formData.get("numDays") || 1,
    travelFrom: formData.get("travelFrom"),
    destination: formData.get("destination"),
    currency: formData.get("currency") || "USD",
    budgetAmount: budgetRaw && budgetRaw !== "" ? budgetRaw : undefined,
    flightClass: formData.get("flightClass") || "",
    hotelType: formData.get("hotelType") || "",
    vehicleType: formData.get("vehicleType") || "",
    travelers: formData.get("travelers") || 1,
    nationality: formData.get("nationality"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const agent = await prisma.user.findFirst({
    where: { id: data.agentId, agencyId: session.user.agencyId },
  });
  if (!agent) {
    return { error: "Selected agent not found" };
  }

  const normalizedEmail = data.email.toLowerCase().trim();

  const existingClient = await prisma.client.findFirst({
    where: {
      agencyId: session.user.agencyId,
      OR: [{ email: normalizedEmail }, ...(data.mobile ? [{ phone: data.mobile }] : [])],
    },
  });

  const clientData = {
    name: data.customerName,
    companyName: data.companyName || null,
    email: normalizedEmail,
    phone: data.mobile,
    whatsapp: data.whatsapp || null,
    city: data.city,
    country: data.country || null,
    address: data.address || null,
  };

  const client = existingClient
    ? await prisma.client.update({
        where: { id: existingClient.id },
        data: clientData,
      })
    : await prisma.client.create({
        data: {
          ...clientData,
          agencyId: session.user.agencyId,
          ownerId: data.agentId,
          source: "Enquiry Form",
          stage: "NEW_LEAD",
        },
      });

  const startDate = new Date(data.travelDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + Math.max(0, data.numDays - 1));

  const trip = await prisma.trip.create({
    data: {
      agencyId: session.user.agencyId,
      clientId: client.id,
      ownerId: data.agentId,
      title: `${data.customerName} — ${data.destination} enquiry`,
      destination: data.destination,
      travelFrom: data.travelFrom,
      startDate,
      endDate,
      numDays: data.numDays,
      travelers: data.travelers,
      nationality: data.nationality,
      budgetAmount: Number.isNaN(data.budgetAmount) ? null : data.budgetAmount,
      currency: data.currency,
      agentAsTraveler: data.agentAsTraveler,
      enquiryType: data.enquiryType,
      services: data.services,
      flightClass: data.flightClass || null,
      hotelType: data.hotelType || null,
      vehicleType: data.vehicleType || null,
      comment: data.comment,
    },
  });

  revalidatePath("/trips");
  revalidatePath("/clients");
  revalidatePath(`/clients/${client.id}`);
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
