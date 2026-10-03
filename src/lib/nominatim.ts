import type { BBox, PlaceHit } from "./types";

const UA = "WayOff/1.0 (hometown navigation game; hackathon)";

export async function searchPlaces(q: string): Promise<PlaceHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Place search failed");
  const rows = (await res.json()) as Array<{
    osm_id: number;
    osm_type: string;
    name?: string;
    display_name: string;
    lat: string;
    lon: string;
    boundingbox: [string, string, string, string];
  }>;

  return rows.map((r) => {
    const [south, north, west, east] = r.boundingbox.map(Number) as [
      number,
      number,
      number,
      number,
    ];
    const bbox: BBox = { south, north, west, east };
    return {
      osmId: `${r.osm_type}:${r.osm_id}`,
      name: r.name || r.display_name.split(",")[0],
      displayName: r.display_name,
      lat: Number(r.lat),
      lon: Number(r.lon),
      bbox,
    };
  });
}
