import { nearestNamedStreet, simplifyLine } from "./geo";
import type { BBox, BuildingNetwork, Destination, LonLat, RoadNetwork } from "./types";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

type OverpassEl = {
  type: string;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
  center?: { lat: number; lon: number };
};

async function overpass(query: string) {
  let last: Error | null = null;
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": "WayOff/1.0",
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      return (await res.json()) as { elements: OverpassEl[] };
    } catch (err) {
      last = err instanceof Error ? err : new Error("Overpass failed");
    }
  }
  throw last ?? new Error("Overpass failed");
}

function bboxStr(b: BBox) {
  return `${b.south},${b.west},${b.north},${b.east}`;
}

function centroid(coords: LonLat[]): LonLat {
  const n = coords.length || 1;
  let x = 0;
  let y = 0;
  for (const c of coords) {
    x += c[0];
    y += c[1];
  }
  return [x / n, y / n];
}

function closeRing(coords: LonLat[]): LonLat[] {
  if (coords.length < 3) return [];
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) return [...coords, first];
  return coords;
}

function buildingHeight(tags?: Record<string, string>) {
  const h = Number.parseFloat(tags?.height ?? "");
  if (Number.isFinite(h) && h > 2) return Math.min(h, 90);
  const levels = Number.parseFloat(tags?.["building:levels"] ?? "");
  if (Number.isFinite(levels) && levels > 0) return Math.min(levels * 3.2, 90);
  return 10;
}

export async function fetchNeighborhood(bbox: BBox): Promise<{
  roads: RoadNetwork;
  buildings: BuildingNetwork;
  dests: Destination[];
}> {
  const bb = bboxStr(bbox);
  const query = `
[out:json][timeout:40];
(
  way["highway"~"^(primary|secondary|tertiary|unclassified|residential|living_street|trunk|pedestrian)$"](${bb});
  way["highway"]["name"](${bb});
  way["building"](${bb});
  node["amenity"~"^(library|school|hospital|cafe|theatre|cinema|townhall|university|college|marketplace|place_of_worship)$"]["name"](${bb});
  node["shop"]["name"](${bb});
  node["tourism"~"^(museum|gallery|hotel)$"]["name"](${bb});
);
out geom qt;
`.trim();

  const data = await overpass(query);
  const features: RoadNetwork["features"] = [];
  const buildingFeatures: BuildingNetwork["features"] = [];
  const dests: Destination[] = [];
  const seen = new Set<string>();

  for (const el of data.elements) {
    const name = el.tags?.name?.trim();
    if (el.type === "way" && el.geometry && el.tags?.highway) {
      const coordinates = simplifyLine(el.geometry.map((g) => [g.lon, g.lat]));
      if (coordinates.length >= 2) {
        features.push({
          type: "Feature",
          properties: name ? { name } : {},
          geometry: { type: "LineString", coordinates },
        });
      }
    } else if (el.type === "way" && el.geometry && el.tags?.building) {
      const ring = closeRing(simplifyLine(el.geometry.map((g) => [g.lon, g.lat]), 8));
      if (ring.length >= 4) {
        buildingFeatures.push({
          type: "Feature",
          properties: { height: buildingHeight(el.tags), name },
          geometry: { type: "Polygon", coordinates: [ring] },
        });
      }
      if (name) {
        const [lon, lat] = centroid(ring.length ? ring : el.geometry.map((g) => [g.lon, g.lat] as LonLat));
        const key = `b:${name.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          dests.push({ name, kind: "building", lon, lat });
        }
      }
    } else if (name && el.tags && !el.tags.highway) {
      let lat: number | undefined;
      let lon: number | undefined;
      if (el.lat != null && el.lon != null) {
        lat = el.lat;
        lon = el.lon;
      } else if (el.center) {
        lat = el.center.lat;
        lon = el.center.lon;
      }
      if (lat != null && lon != null) {
        const key = `b:${name.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          dests.push({ name, kind: "building", lon, lat });
        }
      }
    }
  }

  const namedRoads = features
    .filter((f) => f.properties.name)
    .map((f) => ({ name: f.properties.name, coordinates: f.geometry.coordinates }));

  for (const dest of dests) {
    dest.streetName = nearestNamedStreet([dest.lon, dest.lat], namedRoads) ?? undefined;
  }

  return {
    roads: { type: "FeatureCollection", features },
    buildings: {
      type: "FeatureCollection",
      features: buildingFeatures.slice(0, 900),
    },
    dests,
  };
}
