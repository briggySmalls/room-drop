import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { RoomVerdict } from "@/lib/types";

export interface RoomComparison {
  verdict: RoomVerdict;
  confidence: number;
  reasoning: string;
}

const SYSTEM_PROMPT = `You are a hotel room comparison assistant. Given an original room booking and a candidate room, determine if the candidate is a match, upgrade, or downgrade.

Respond ONLY with valid JSON in this exact format:
{"verdict": "match" | "upgrade" | "downgrade", "confidence": 0.0-1.0, "reasoning": "brief explanation"}

Guidelines:
- "match": Same or equivalent room type (e.g. "Deluxe King" vs "Deluxe King Room")
- "upgrade": Better room (e.g. "Suite" when original was "Standard King")
- "downgrade": Worse room (e.g. "Standard Twin" when original was "Deluxe King Suite")
- Confidence reflects how certain you are about the verdict given the available descriptions
- Be generous with "match" when descriptions are vague but compatible`;

export async function compareRooms(
  originalRoom: string,
  candidateRoom: string,
  hotelName: string,
): Promise<RoomComparison> {
  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Hotel: ${hotelName}\nOriginal room: ${originalRoom}\nCandidate room: ${candidateRoom}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    return {
      verdict: parsed.verdict,
      confidence: Number(parsed.confidence),
      reasoning: parsed.reasoning,
    };
  } catch {
    return {
      verdict: "match",
      confidence: 0.3,
      reasoning: `Failed to parse LLM response: ${text.slice(0, 100)}`,
    };
  }
}
