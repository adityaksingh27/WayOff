import { randomUUID } from "crypto";
import {
  bboxSpanM,
  challengeFingerprint,
  haversineM,
  hashSeed,
  mulberry32,
  nearestNamedStreet,
  randomPointOnLines,
  shrinkBBoxAround,
} from "./geo";
import { searchPlaces } from "./nominatim";
import { fetchNeighborhood } from "./overpass";
import { addChallenge, getChallenge } from "./store";
import type { Challenge, LonLat, PlaceHit } from "./types";

const MIN_M = 420;
const MAX_M = 1600;

export async function createChallenge(query: string, seed?: string): Promise<Challenge> {
  const hits = await searchPlaces(query);
  const place = hits[0];
  if (!place) throw new Error("Could not find that place. Try a neighborhood or city name.");
  return createChallengeFromPlace(place, seed);
}

export async function createChallengeFromPlace(place: PlaceHit, seed?: string): Promise<Challenge> {
  const rand = mulberry32(hashSeed((seed ?? randomUUID()) + place.osmId));
  let bbox = place.bbox;
  if (bboxSpanM(bbox) > 7000) {
    const jitter: LonLat = [
      place.lon + (rand() - 0.5) * 0.02,
      place.lat + (rand() - 0.5) * 0.02,
    ];
    bbox = shrinkBBoxAround(jitter, 1.35);
  }

  const { roads, dests, buildings } = await fetchNeighborhood(bbox);
  const namedLines = roads.features.filter((f) => f.properties.name);
  const spawnLines = (namedLines.length >= 4 ? namedLines : roads.features).map(
    (f) => f.geometry.coordinates,
  );
  const lines = roads.features.map((f) => f.geometry.coordinates);
  if (lines.length < 8) {
    throw new Error("Not enough mapped streets there. Try a denser neighborhood.");
  }
  if (!dests.length) {
    throw new Error("No named buildings in that box. Try a busier neighborhood.");
  }

  const pool = dests.filter((d) => d.kind === "building");
  const hunt = pool.length ? pool : dests;

  let spawn: LonLat = [place.lon, place.lat];
  let dest = hunt[0];
  let ok = false;
  for (let i = 0; i < 80; i++) {
    spawn = randomPointOnLines(spawnLines, rand);
    const cand = hunt[Math.floor(rand() * hunt.length)];
    if (!cand) break;
    const d = haversineM(spawn, [cand.lon, cand.lat]);
    if (d >= MIN_M && d <= MAX_M) {
      dest = cand;
      ok = true;
      break;
    }
  }
  if (!ok || !dest) {
    spawn = randomPointOnLines(spawnLines, rand);
    dest = hunt.reduce((best, cur) => {
      const bd = Math.abs(haversineM(spawn, [best.lon, best.lat]) - 900);
      const cd = Math.abs(haversineM(spawn, [cur.lon, cur.lat]) - 900);
      return cd < bd ? cur : best;
    }, hunt[0]);
  }

  dest.streetName =
    dest.streetName ||
    nearestNamedStreet(
      [dest.lon, dest.lat],
      namedLines.map((f) => ({ name: f.properties.name, coordinates: f.geometry.coordinates })),
    ) ||
    undefined;

  const challenge: Challenge = {
    id: randomUUID(),
    fingerprint: challengeFingerprint(place.osmId, dest),
    place: { ...place, bbox },
    spawn: { lon: spawn[0], lat: spawn[1] },
    dest,
    roads,
    buildings,
    createdAt: new Date().toISOString(),
  };
  await addChallenge(challenge);
  return challenge;
}

export async function loadChallenge(id: string) {
  return getChallenge(id);
}
