export type LonLat = [number, number];

export type BBox = {
  south: number;
  north: number;
  west: number;
  east: number;
};

export type PlaceHit = {
  osmId: string;
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  bbox: BBox;
};

export type DestKind = "street" | "building";

export type Destination = {
  name: string;
  kind: DestKind;
  lon: number;
  lat: number;
  streetName?: string;
};

export type BuildingNetwork = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { height: number; name?: string };
    geometry: {
      type: "Polygon";
      coordinates: LonLat[][];
    };
  }>;
};

export type RoadNetwork = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { name?: string };
    geometry: {
      type: "LineString";
      coordinates: LonLat[];
    };
  }>;
};

export type Challenge = {
  id: string;
  fingerprint: string;
  place: PlaceHit;
  spawn: { lon: number; lat: number };
  dest: Destination;
  roads: RoadNetwork;
  buildings: BuildingNetwork;
  createdAt: string;
};

export type GhostRun = {
  id: string;
  challengeId: string;
  fingerprint: string;
  playerName: string;
  path: LonLat[];
  durationMs: number;
  distanceM: number;
  score: number;
  finished: boolean;
  createdAt: string;
};

export type CopilotMessage = {
  role: "user" | "assistant";
  text: string;
};
