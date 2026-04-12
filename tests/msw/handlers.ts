import { http, HttpResponse, RequestHandler } from "msw";
import hotelSearchRitz from "../fixtures/serpapi/hotel-search-ritz.json";
import hotelSearchNoDeals from "../fixtures/serpapi/hotel-search-no-deals.json";
import hotelSearchNrWindow from "../fixtures/serpapi/hotel-search-nr-window.json";
import hotelDetailsRitz from "../fixtures/serpapi/hotel-details-ritz.json";
import hotelDetailsNoDeals from "../fixtures/serpapi/hotel-details-no-deals.json";
import hotelDetailsNrWindow from "../fixtures/serpapi/hotel-details-nr-window.json";
import hotelSearchMixedRooms from "../fixtures/serpapi/hotel-search-mixed-rooms.json";
import hotelDetailsMixedRooms from "../fixtures/serpapi/hotel-details-mixed-rooms.json";
import roomMatch from "../fixtures/anthropic/room-match.json";
import roomDowngrade from "../fixtures/anthropic/room-downgrade.json";
import roomLowConfidence from "../fixtures/anthropic/room-low-confidence.json";
import sendSuccess from "../fixtures/resend/send-success.json";

export const handlers: RequestHandler[] = [
  // SerpAPI — routes based on whether property_token is present (details vs search)
  http.get("https://serpapi.com/search", ({ request }) => {
    const url = new URL(request.url);
    const propertyToken = url.searchParams.get("property_token");
    const query = url.searchParams.get("q") ?? "";

    // Property details request (step 2)
    if (propertyToken) {
      if (propertyToken === "test-no-deals-token") {
        return HttpResponse.json(hotelDetailsNoDeals);
      }
      if (propertyToken === "test-nr-window-token") {
        return HttpResponse.json(hotelDetailsNrWindow);
      }
      if (propertyToken === "test-mixed-rooms-token") {
        return HttpResponse.json(hotelDetailsMixedRooms);
      }
      return HttpResponse.json(hotelDetailsRitz);
    }

    // Hotel search request (step 1)
    if (query.toLowerCase().includes("no-deals-hotel")) {
      return HttpResponse.json(hotelSearchNoDeals);
    }
    if (query.toLowerCase().includes("nr-window-hotel")) {
      return HttpResponse.json(hotelSearchNrWindow);
    }
    if (query.toLowerCase().includes("mixed rooms hotel")) {
      return HttpResponse.json(hotelSearchMixedRooms);
    }
    return HttpResponse.json(hotelSearchRitz);
  }),

  // Anthropic Messages API — returns different fixtures based on room content
  http.post("https://api.anthropic.com/v1/messages", async ({ request }) => {
    const body = (await request.json()) as {
      messages?: { content?: string }[];
    };
    const userMessage = body?.messages?.[0]?.content ?? "";

    if (userMessage.includes("Standard Twin Room")) {
      return HttpResponse.json(roomDowngrade);
    }
    if (userMessage.includes("Room\n") || userMessage.includes("Room")) {
      if (
        userMessage.includes("Candidate room: Room") ||
        userMessage.includes("candidate room: Room")
      ) {
        return HttpResponse.json(roomLowConfidence);
      }
    }

    return HttpResponse.json(roomMatch);
  }),

  // Resend API — always returns success
  http.post("https://api.resend.com/emails", () => {
    return HttpResponse.json(sendSuccess);
  }),
];
