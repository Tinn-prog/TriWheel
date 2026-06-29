const NOMINATIM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "TriWheel/1.0 (ride-hailing demo; admin@triwheel.test)",
};

type NominatimSearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
};

export async function nominatimSearch(query: string, limit = 6) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${query}, Metro Manila, Philippines`);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("countrycodes", "ph");
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString(), {
    headers: NOMINATIM_HEADERS,
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error("Place search failed.");
  }

  return (await response.json()) as NominatimSearchResult[];
}

export async function nominatimReverse(lat: number, lng: number) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), {
    headers: NOMINATIM_HEADERS,
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error("Reverse geocoding failed.");
  }

  return (await response.json()) as { display_name?: string };
}

export function formatNominatimSuggestion(result: NominatimSearchResult) {
  const parts = result.display_name.split(",").map((part) => part.trim());

  return {
    display_name: parts[0] ?? result.display_name,
    lat: result.lat,
    lon: result.lon,
    place_id: `${result.lat},${result.lon}`,
    secondary_text: parts.slice(1, 4).join(", "),
  };
}
