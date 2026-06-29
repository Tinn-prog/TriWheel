import { formatNominatimSuggestion, nominatimSearch } from "@/lib/nominatim";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = (await nominatimSearch(query)).map(formatNominatimSuggestion);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
