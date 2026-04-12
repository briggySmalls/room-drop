import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "../tests/fixtures");

function loadFixture(path) {
  return JSON.parse(readFileSync(resolve(fixturesDir, path), "utf-8"));
}

const hotelSearchRitz = loadFixture("serpapi/hotel-search-ritz.json");
const hotelSearchNoDeals = loadFixture("serpapi/hotel-search-no-deals.json");
const hotelSearchFiresale = loadFixture("serpapi/hotel-search-firesale.json");
const hotelDetailsRitz = loadFixture("serpapi/hotel-details-ritz.json");
const hotelDetailsNoDeals = loadFixture("serpapi/hotel-details-no-deals.json");
const hotelDetailsFiresale = loadFixture("serpapi/hotel-details-firesale.json");
const roomMatch = loadFixture("anthropic/room-match.json");
const roomDowngrade = loadFixture("anthropic/room-downgrade.json");
const sendSuccess = loadFixture("resend/send-success.json");

const handlers = [
  http.get("https://serpapi.com/search", ({ request }) => {
    const url = new URL(request.url);
    const propertyToken = url.searchParams.get("property_token");
    const query = url.searchParams.get("q") ?? "";

    if (propertyToken) {
      if (propertyToken === "test-no-deals-token") {
        return HttpResponse.json(hotelDetailsNoDeals);
      }
      if (propertyToken === "test-firesale-token") {
        return HttpResponse.json(hotelDetailsFiresale);
      }
      return HttpResponse.json(hotelDetailsRitz);
    }

    if (query.toLowerCase().includes("no-deals-hotel")) {
      return HttpResponse.json(hotelSearchNoDeals);
    }
    if (query.toLowerCase().includes("fire-sale-hotel")) {
      return HttpResponse.json(hotelSearchFiresale);
    }
    return HttpResponse.json(hotelSearchRitz);
  }),

  http.post("https://api.anthropic.com/v1/messages", async ({ request }) => {
    const body = await request.json();
    const userMessage = body?.messages?.[0]?.content ?? "";
    if (userMessage.includes("Standard Twin Room")) {
      return HttpResponse.json(roomDowngrade);
    }
    return HttpResponse.json(roomMatch);
  }),

  http.post("https://api.resend.com/emails", () => {
    return HttpResponse.json(sendSuccess);
  }),
];

const server = setupServer(...handlers);
server.listen({ onUnhandledRequest: "bypass" });
console.log("[MSW] Mock server started with", handlers.length, "handlers");
