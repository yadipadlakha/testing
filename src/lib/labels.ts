import type { BadgeProps } from "@/components/ui/badge";
import type { LeadStage, TripStatus, InteractionType, ActivityCategory } from "@prisma/client";

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  NEW_LEAD: "New lead",
  CONTACTED: "Contacted",
  PROPOSAL_SENT: "Proposal sent",
  NEGOTIATION: "Negotiation",
  BOOKED: "Booked",
  TRAVELED: "Traveled",
  LOST: "Lost",
};

export const LEAD_STAGE_VARIANT: Record<LeadStage, NonNullable<BadgeProps["variant"]>> = {
  NEW_LEAD: "slate",
  CONTACTED: "blue",
  PROPOSAL_SENT: "purple",
  NEGOTIATION: "amber",
  BOOKED: "green",
  TRAVELED: "green",
  LOST: "red",
};

export const LEAD_STAGES: LeadStage[] = [
  "NEW_LEAD",
  "CONTACTED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "BOOKED",
  "TRAVELED",
  "LOST",
];

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  INQUIRY: "Inquiry",
  PLANNING: "Planning",
  QUOTED: "Quoted",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const TRIP_STATUS_VARIANT: Record<TripStatus, NonNullable<BadgeProps["variant"]>> = {
  INQUIRY: "slate",
  PLANNING: "blue",
  QUOTED: "purple",
  CONFIRMED: "amber",
  IN_PROGRESS: "amber",
  COMPLETED: "green",
  CANCELLED: "red",
};

export const TRIP_STATUSES: TripStatus[] = [
  "INQUIRY",
  "PLANNING",
  "QUOTED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export const INTERACTION_TYPE_LABEL: Record<InteractionType, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  WHATSAPP: "WhatsApp",
  NOTE: "Note",
};

export const INTERACTION_TYPES: InteractionType[] = ["CALL", "EMAIL", "MEETING", "WHATSAPP", "NOTE"];

export const ACTIVITY_CATEGORY_LABEL: Record<ActivityCategory, string> = {
  SIGHTSEEING: "Sightseeing",
  FOOD: "Food & dining",
  TRANSPORT: "Transport",
  ACCOMMODATION: "Accommodation",
  ACTIVITY: "Activity",
  FREE_TIME: "Free time",
};

export const ACTIVITY_CATEGORY_VARIANT: Record<ActivityCategory, NonNullable<BadgeProps["variant"]>> = {
  SIGHTSEEING: "blue",
  FOOD: "amber",
  TRANSPORT: "slate",
  ACCOMMODATION: "purple",
  ACTIVITY: "default",
  FREE_TIME: "green",
};
