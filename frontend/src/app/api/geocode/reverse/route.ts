import { nominatimReverse } from "@/lib/nominatim";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
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
