import type { Badge } from "@/components/ui/badge";
import type {
  LeadStage,
  TripStatus,
  InteractionType,
  ActivityCategory,
  EnquiryType,
  ServiceType,
  FlightClass,
  HotelType,
  VehicleType,
} from "@prisma/client";

type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>["variant"]>;

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  NEW_LEAD: "New lead",
  CONTACTED: "Contacted",
  PROPOSAL_SENT: "Proposal sent",
  NEGOTIATION: "Negotiation",
  BOOKED: "Booked",
  TRAVELED: "Traveled",
  LOST: "Lost",
};

export const LEAD_STAGE_VARIANT: Record<LeadStage, BadgeVariant> = {
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

export const TRIP_STATUS_VARIANT: Record<TripStatus, BadgeVariant> = {
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

export const ACTIVITY_CATEGORY_VARIANT: Record<ActivityCategory, BadgeVariant> = {
  SIGHTSEEING: "blue",
  FOOD: "amber",
  TRANSPORT: "slate",
  ACCOMMODATION: "purple",
  ACTIVITY: "default",
  FREE_TIME: "green",
};

export const ENQUIRY_TYPE_LABEL: Record<EnquiryType, string> = {
  INDIVIDUAL: "Individual",
  FAMILY: "Family",
  GROUP: "Group",
  CORPORATE: "Corporate",
  HONEYMOON: "Honeymoon",
};

export const ENQUIRY_TYPES: EnquiryType[] = ["INDIVIDUAL", "FAMILY", "GROUP", "CORPORATE", "HONEYMOON"];

export const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  FLIGHT: "Flight",
  HOTEL: "Hotel",
  VISA: "Visa",
  PACKAGE: "Package",
  TRANSPORT: "Transport",
  CRUISE: "Cruise",
  ACTIVITY: "Activity",
  INSURANCE: "Insurance",
  TRAIN: "Train",
};

export const SERVICE_TYPES: ServiceType[] = [
  "FLIGHT",
  "HOTEL",
  "VISA",
  "PACKAGE",
  "TRANSPORT",
  "CRUISE",
  "ACTIVITY",
  "INSURANCE",
  "TRAIN",
];

export const FLIGHT_CLASS_LABEL: Record<FlightClass, string> = {
  ECONOMY: "Economy",
  PREMIUM_ECONOMY: "Premium Economy",
  BUSINESS: "Business",
  FIRST: "First",
};

export const FLIGHT_CLASSES: FlightClass[] = ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"];

export const HOTEL_TYPE_LABEL: Record<HotelType, string> = {
  BUDGET: "Budget",
  STANDARD: "Standard",
  DELUXE: "Deluxe",
  LUXURY: "Luxury",
};

export const HOTEL_TYPES: HotelType[] = ["BUDGET", "STANDARD", "DELUXE", "LUXURY"];

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  NONE: "None",
  SEDAN: "Sedan",
  SUV: "SUV",
  VAN: "Van",
  COACH: "Coach",
  LUXURY_CAR: "Luxury car",
};

export const VEHICLE_TYPES: VehicleType[] = ["NONE", "SEDAN", "SUV", "VAN", "COACH", "LUXURY_CAR"];
