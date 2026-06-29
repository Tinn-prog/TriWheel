import { calculateDistanceKm } from "@/lib/mapTypes";
import {
  formatNominatimSuggestion,
  nominatimReverse,
  nominatimSearch,
} from "@/lib/nominatim";
import { NextResponse } from "next/server";

type OsrmRouteResponse = {
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      coordinates?: [number, number][];
    };
  }>;
};

function straightLineRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const straightDistance = calculateDistanceKm(from, to);

  return NextResponse.json({
    distanceKm: straightDistance,
    durationMinutes: Math.max(1, Math.round((straightDistance / 20) * 60)),
    path: [from, to],
    source: "straight",
    message: "Using straight-line fallback.",
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  if (mode === "search") {
    const query = searchParams.get("q")?.trim() ?? "";

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    try {
      const results = (await nominatimSearch(query)).map(formatNominatimSuggestion);
      return NextResponse.json({ results });
    } catch {
      return NextResponse.json(
        { message: "Geocoding search failed." },
        { status: 502 },
      );
    }
  }

  if (mode === "reverse") {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json(
        { message: "Latitude and longitude are required." },
        { status: 400 },
      );
    }

    try {
      const data = await nominatimReverse(Number(lat), Number(lng));

      return NextResponse.json({
        address: data.display_name ?? `${lat}, ${lng}`,
      });
    } catch {
      return NextResponse.json({
        address: `${lat}, ${lng}`,
        message: "Reverse geocoding failed.",
      });
    }
  }

  if (mode === "place-details") {
    const placeId = searchParams.get("placeId")?.trim() ?? "";
    const [latText, lngText] = placeId.split(",");
    const lat = Number(latText);
    const lng = Number(lngText);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ message: "Invalid place id." }, { status: 400 });
    }

    try {
      const data = await nominatimReverse(lat, lng);

      return NextResponse.json({
        address: data.display_name ?? `${lat}, ${lng}`,
        point: { lat, lng },
      });
    } catch {
      return NextResponse.json({
        address: `${lat}, ${lng}`,
        point: { lat, lng },
      });
    }
  }

  const originLat = searchParams.get("originLat");
  const originLng = searchParams.get("originLng");
  const destinationLat = searchParams.get("destinationLat");
  const destinationLng = searchParams.get("destinationLng");

  if (!originLat || !originLng || !destinationLat || !destinationLng) {
    return NextResponse.json(
      { message: "Origin and destination coordinates are required." },
      { status: 400 },
    );
  }

  const from = {
    lat: Number(originLat),
    lng: Number(originLng),
  };
  const to = {
    lat: Number(destinationLat),
    lng: Number(destinationLng),
  };

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { next: { revalidate: 0 } });
    const data = (await response.json()) as OsrmRouteResponse;
    const route = data.routes?.[0];
    const coordinates = route?.geometry?.coordinates ?? [];

    if (!route?.distance || !route.duration || coordinates.length < 2) {
      return straightLineRoute(from, to);
    }

    return NextResponse.json({
      distanceKm: route.distance / 1000,
      durationMinutes: Math.max(1, Math.round(route.duration / 60)),
      path: coordinates.map(([lng, lat]) => ({ lat, lng })),
      source: "road",
    });
  } catch {
    return straightLineRoute(from, to);
  }
}
