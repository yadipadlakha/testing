import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const activitySchema = z.object({
  order: z.number(),
  startTime: z.string().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  category: z.enum(["SIGHTSEEING", "FOOD", "TRANSPORT", "ACCOMMODATION", "ACTIVITY", "FREE_TIME"]),
  estimatedCost: z.number().nullable().optional(),
  durationMinutes: z.number().nullable().optional(),
});

const daySchema = z.object({
  dayNumber: z.number(),
  title: z.string(),
  location: z.string().nullable().optional(),
  activities: z.array(activitySchema),
});

export const generatedItinerarySchema = z.object({
  summary: z.string(),
  totalEstimatedCost: z.number().nullable().optional(),
  days: z.array(daySchema),
});

export type GeneratedItinerary = z.infer<typeof generatedItinerarySchema>;

export type ItineraryGenerationInput = {
  destination: string;
  startDate: Date | null;
  endDate: Date | null;
  travelers: number;
  budgetAmount: number | null;
  currency: string;
  preferences: string;
};

const BUILD_ITINERARY_TOOL: Anthropic.Tool = {
  name: "build_itinerary",
  description: "Return a structured, day-by-day travel itinerary.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "2-3 sentence overview of the trip and why it fits the traveler's brief.",
      },
      totalEstimatedCost: {
        type: "number",
        description: "Rough total estimated cost across all days, in the requested currency.",
      },
      days: {
        type: "array",
        items: {
          type: "object",
          properties: {
            dayNumber: { type: "number" },
            title: { type: "string", description: "Short theme for the day, e.g. 'Old Town & Coastline'" },
            location: { type: "string" },
            activities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  order: { type: "number" },
                  startTime: { type: "string", description: "e.g. '09:00'" },
                  title: { type: "string" },
                  description: { type: "string" },
                  location: { type: "string" },
                  category: {
                    type: "string",
                    enum: ["SIGHTSEEING", "FOOD", "TRANSPORT", "ACCOMMODATION", "ACTIVITY", "FREE_TIME"],
                  },
                  estimatedCost: { type: "number" },
                  durationMinutes: { type: "number" },
                },
                required: ["order", "title", "category"],
              },
            },
          },
          required: ["dayNumber", "title", "activities"],
        },
      },
    },
    required: ["summary", "days"],
  },
};

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your .env file to enable AI itinerary generation.",
    );
  }
  return new Anthropic({ apiKey });
}

export async function generateItinerary(input: ItineraryGenerationInput): Promise<GeneratedItinerary> {
  const client = getClient();
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const nights =
    input.startDate && input.endDate
      ? Math.max(1, Math.round((input.endDate.getTime() - input.startDate.getTime()) / 86_400_000))
      : null;

  const userPrompt = [
    `Plan a trip to ${input.destination} for ${input.travelers} traveler(s).`,
    input.startDate ? `Start date: ${input.startDate.toISOString().slice(0, 10)}.` : null,
    input.endDate ? `End date: ${input.endDate.toISOString().slice(0, 10)}.` : null,
    nights ? `That's ${nights} day(s).` : "Assume a reasonable trip length (4-6 days) if not specified.",
    input.budgetAmount ? `Total budget: ${input.budgetAmount} ${input.currency}.` : null,
    input.preferences ? `Traveler preferences / notes: ${input.preferences}` : null,
    "Produce a realistic, well-paced day-by-day itinerary with specific activities, approximate timing, and rough cost estimates. Call the build_itinerary tool with the result.",
  ]
    .filter(Boolean)
    .join("\n");

  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    system:
      "You are an expert travel agent assistant building itineraries for a travel agency's clients. Be specific and realistic (real neighborhoods, landmarks, logistics), avoid generic filler, and keep budgets plausible for the destination.",
    messages: [{ role: "user", content: userPrompt }],
    tools: [BUILD_ITINERARY_TOOL],
    tool_choice: { type: "tool", name: "build_itinerary" },
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("The AI did not return a structured itinerary. Please try again.");
  }

  const parsed = generatedItinerarySchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error("The AI returned an itinerary in an unexpected format.");
  }

  return parsed.data;
}
