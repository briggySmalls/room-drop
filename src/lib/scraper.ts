import { env } from "@/lib/env";

export interface HotelRate {
  source: string;
  price: number;
  room_description: string;
  link: string | null;
  free_cancellation: boolean;
}

interface SerpApiSearchProperty {
  name?: string;
  property_token?: string;
  total_rate?: { extracted_lowest?: number };
}

interface SerpApiSearchResponse {
  properties?: SerpApiSearchProperty[];
  prices?: SerpApiPriceEntry[];
  featured_prices?: SerpApiPriceEntry[];
  error?: string;
}

interface SerpApiRoom {
  name?: string;
  link?: string;
  total_rate?: { extracted_lowest?: number };
  num_guests?: number;
}

interface SerpApiPriceEntry {
  source?: string;
  link?: string;
  total_rate?: { extracted_lowest?: number };
  rooms?: SerpApiRoom[];
  free_cancellation?: boolean;
}

interface SerpApiDetailsResponse {
  prices?: SerpApiPriceEntry[];
  featured_prices?: SerpApiPriceEntry[];
  error?: string;
}

export async function searchHotelPrices(
  hotelName: string,
  location: string | null,
  checkIn: string,
  checkOut: string,
  numGuests: number,
): Promise<{ rates: HotelRate[]; raw: unknown; propertyFound: boolean }> {
  // Step 1: Search for the hotel to get its property_token
  const query = location ? `${hotelName} ${location}` : hotelName;
  const searchParams = new URLSearchParams({
    engine: "google_hotels",
    q: query,
    check_in_date: checkIn,
    check_out_date: checkOut,
    adults: String(numGuests),
    currency: "GBP",
    api_key: env.serpApiKey,
  });

  const searchRes = await fetch(`https://serpapi.com/search?${searchParams}`);
  const searchData: SerpApiSearchResponse = await searchRes.json();

  if (searchData.error) {
    console.error("SerpAPI search error:", searchData.error);
    return { rates: [], raw: searchData, propertyFound: false };
  }

  // SerpAPI returns property details directly when the query matches exactly
  if (searchData.prices || searchData.featured_prices) {
    const rates = parseRates(searchData);
    return { rates, raw: searchData, propertyFound: true };
  }

  const matchedProperty = searchData.properties?.[0];
  if (!matchedProperty?.property_token) {
    console.error("SerpAPI: no matching property found");
    return { rates: [], raw: searchData, propertyFound: false };
  }

  // Step 2: Fetch property details for per-source pricing
  const detailParams = new URLSearchParams({
    engine: "google_hotels",
    property_token: matchedProperty.property_token,
    q: query,
    check_in_date: checkIn,
    check_out_date: checkOut,
    adults: String(numGuests),
    currency: "GBP",
    api_key: env.serpApiKey,
  });

  const detailRes = await fetch(`https://serpapi.com/search?${detailParams}`);
  const detailData: SerpApiDetailsResponse = await detailRes.json();

  if (detailData.error) {
    console.error("SerpAPI detail error:", detailData.error);
    return {
      rates: [],
      raw: { search: searchData, details: detailData },
      propertyFound: true,
    };
  }

  const rates = parseRates(detailData);
  return {
    rates,
    raw: { search: searchData, details: detailData },
    propertyFound: true,
  };
}

function parseRates(data: SerpApiDetailsResponse): HotelRate[] {
  const rates: HotelRate[] = [];
  const allPrices = [...(data.prices ?? []), ...(data.featured_prices ?? [])];

  for (const entry of allPrices) {
    if (!entry.source) continue;

    if (entry.rooms && entry.rooms.length > 0) {
      for (const room of entry.rooms) {
        const total = room.total_rate?.extracted_lowest;
        if (!total) continue;

        const roomName = room.name ?? "Unknown room";
        rates.push({
          source: entry.source,
          price: total,
          room_description: roomName.replace(/\s*-\s*Non-Refundable$/i, ""),
          link: room.link ?? entry.link ?? null,
          free_cancellation: isRefundable(entry, roomName),
        });
      }
    } else {
      const total = entry.total_rate?.extracted_lowest;
      if (!total) continue;

      rates.push({
        source: entry.source,
        price: total,
        room_description: "Unknown room",
        link: entry.link ?? null,
        free_cancellation: isRefundable(entry, ""),
      });
    }
  }

  return rates;
}

function isRefundable(entry: SerpApiPriceEntry, roomName: string): boolean {
  if (entry.free_cancellation === true) return true;
  if (entry.free_cancellation === false) return false;
  if (/non-refundable/i.test(roomName)) return false;
  // Default to true when not explicitly marked non-refundable
  return true;
}
