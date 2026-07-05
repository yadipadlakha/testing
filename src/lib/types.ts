// Shared types for the itinerary domain.
// `days` and `tips` are stored on the Itinerary as structured data; these
// types describe the shape the AI produces and the UI consumes.

export interface Activity {
  time: string; // e.g. "09:00" or "Morning"
  title: string;
  description: string;
  location: string;
  category: string; // e.g. "Food", "Sightseeing", "Transport", "Leisure"
  estimatedCost: string; // human-readable, e.g. "$40 pp" or "Free"
}

export interface ItineraryDay {
  day: number;
  date: string; // ISO date (YYYY-MM-DD) or empty string
  title: string;
  activities: Activity[];
}

export interface GeneratedItinerary {
  title: string;
  summary: string;
  days: ItineraryDay[];
  tips: string[];
}

export type Pace = "relaxed" | "balanced" | "packed";

export interface TripInput {
  destination: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  travelers: number;
  budget?: string;
  interests: string[];
  pace: Pace;
  notes?: string;
}

export const INTEREST_OPTIONS = [
  "Food & Dining",
  "History & Culture",
  "Nature & Outdoors",
  "Beaches",
  "Nightlife",
  "Shopping",
  "Art & Museums",
  "Adventure",
  "Relaxation & Wellness",
  "Family-friendly",
] as const;

export const STATUS_OPTIONS = ["draft", "quoted", "booked"] as const;
export type Status = (typeof STATUS_OPTIONS)[number];
