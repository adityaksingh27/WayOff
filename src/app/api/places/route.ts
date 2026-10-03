import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/nominatim";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ places: [] });
  try {
    const places = await searchPlaces(q);
    return NextResponse.json({ places });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 502 },
    );
  }
}
