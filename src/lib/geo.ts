import type { BBox, LonLat } from "./types";

const EARTH_M = 6371000;

export function toRad(d: number) {
  return (d * Math.PI) / 180;
}

export function toDeg(r: number) {
  return (r * 180) / Math.PI;
}

export function haversineM(a: LonLat, b: LonLat) {
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function destinationPoint(from: LonLat, bearingDeg: number, distM: number): LonLat {
  const br = toRad(bearingDeg);
  const lat1 = toRad(from[1]);
  const lon1 = toRad(from[0]);
  const ang = distM / EARTH_M;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(ang) + Math.cos(lat1) * Math.sin(ang) * Math.cos(br),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(br) * Math.sin(ang) * Math.cos(lat1),
      Math.cos(ang) - Math.sin(lat1) * Math.sin(lat2),
    );
  return [toDeg(lon2), toDeg(lat2)];
}

export function bearingDeg(from: LonLat, to: LonLat) {
  const lat1 = toRad(from[1]);
  const lat2 = toRad(to[1]);
  const dLon = toRad(to[0] - from[0]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function pathLengthM(path: LonLat[]) {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += haversineM(path[i - 1], path[i]);
  return total;
}

export function bboxSpanM(bbox: BBox) {
  const sw: LonLat = [bbox.west, bbox.south];
  const ne: LonLat = [bbox.east, bbox.north];
  return haversineM(sw, ne);
}

export function shrinkBBoxAround(center: LonLat, halfKm: number): BBox {
  const dLat = halfKm / 111.32;
  const dLon = halfKm / (111.32 * Math.cos(toRad(center[1])));
  return {
    south: center[1] - dLat,
    north: center[1] + dLat,
    west: center[0] - dLon,
    east: center[0] + dLon,
  };
}

export function pointInBBox(p: LonLat, bbox: BBox) {
  return p[0] >= bbox.west && p[0] <= bbox.east && p[1] >= bbox.south && p[1] <= bbox.north;
}

export function simplifyLine(coords: LonLat[], minM = 16): LonLat[] {
  if (coords.length < 3) return coords;
  const out: LonLat[] = [coords[0]];
  for (let i = 1; i < coords.length - 1; i++) {
    if (haversineM(out[out.length - 1], coords[i]) >= minM) out.push(coords[i]);
  }
  out.push(coords[coords.length - 1]);
  return out;
}

export function challengeFingerprint(placeOsmId: string, dest: { name: string; kind: string }) {
  return `${placeOsmId}::${dest.kind}::${dest.name.trim().toLowerCase()}`;
}

export function closestOnRoads(p: LonLat, roads: LonLat[][]): { point: LonLat; dist: number } {
  let min = Infinity;
  let point: LonLat = p;
  for (const line of roads) {
    for (let i = 1; i < line.length; i++) {
      const snapped = projectOnSeg(p, line[i - 1], line[i]);
      const d = haversineM(p, snapped);
      if (d < min) {
        min = d;
        point = snapped;
      }
    }
  }
  return { point, dist: min };
}

export function minDistToRoadsM(p: LonLat, roads: LonLat[][]) {
  return closestOnRoads(p, roads).dist;
}

export function snapToRoads(p: LonLat, roads: LonLat[][], maxM = 42): LonLat {
  const hit = closestOnRoads(p, roads);
  return hit.dist <= maxM ? hit.point : p;
}

export function nearestNamedStreet(
  p: LonLat,
  roads: Array<{ name?: string; coordinates: LonLat[] }>,
): string | null {
  let best = Infinity;
  let name: string | null = null;
  for (const road of roads) {
    if (!road.name) continue;
    const d = minDistToRoadsM(p, [road.coordinates]);
    if (d < best) {
      best = d;
      name = road.name;
    }
  }
  return name;
}

function projectOnSeg(p: LonLat, a: LonLat, b: LonLat): LonLat {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return a;
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)),
  );
  return [a[0] + t * dx, a[1] + t * dy];
}

export function randomPointOnLines(lines: LonLat[][], rand: () => number): LonLat {
  const usable = lines.filter((l) => l.length >= 2);
  const line = usable[Math.floor(rand() * usable.length)] ?? lines[0];
  const i = Math.max(1, Math.floor(rand() * (line.length - 1)));
  const t = rand();
  const a = line[i - 1];
  const b = line[i];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function mulberry32(seed: number) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function scoreRun(opts: {
  durationMs: number;
  pathM: number;
  crowM: number;
  peekedLabels: boolean;
}) {
  const timePen = Math.min(55, opts.durationMs / 1000 / 6);
  const efficiency = opts.crowM > 0 ? opts.pathM / opts.crowM : 3;
  const routePen = Math.min(35, Math.max(0, (efficiency - 1.15) * 18));
  const peekPen = opts.peekedLabels ? 18 : 0;
  const raw = 100 - timePen - routePen - peekPen;
  return Math.max(12, Math.round(raw));
}
