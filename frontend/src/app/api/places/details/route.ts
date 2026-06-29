import { nominatimReverse } from "@/lib/nominatim";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId")?.trim() ?? "";

  const [latText, lngText] = placeId.split(",");
  const lat = Number(latText);
  const lng = Number(lngText);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { message: "Invalid place id." },
      { status: 400 },
    );
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
