"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { destinationPoint } from "@/lib/geo";
import { configureMaplibre } from "@/lib/maplibre";
import type { Challenge, GhostRun, LonLat } from "@/lib/types";

type Props = {
  challenge: Challenge;
  pos: LonLat;
  heading: number;
  trail: LonLat[];
  ghosts: GhostRun[];
  northUp: boolean;
  showLabels: boolean;
  showDest: boolean;
};

const NIGHT_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    {
      id: "night",
      type: "background",
      paint: { "background-color": "#07110e" },
    },
  ],
};

export default function GameMap({
  challenge,
  pos,
  heading,
  trail,
  ghosts,
  northUp,
  showLabels,
  showDest,
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const ready = useRef(false);

  useEffect(() => {
    if (!wrap.current || mapRef.current) return;
    configureMaplibre();
    const map = new maplibregl.Map({
      container: wrap.current,
      style: NIGHT_STYLE,
      center: [challenge.spawn.lon, challenge.spawn.lat],
      zoom: 17.15,
      pitch: 62,
      bearing: 0,
      maxPitch: 72,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on("load", () => {
      try {
        map.setSky({
          "sky-color": "#17352c",
          "horizon-color": "#2a4a40",
          "fog-color": "#07110e",
        });
      } catch {
        /* optional */
      }

      map.addSource("buildings", {
        type: "geojson",
        data: challenge.buildings ?? { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "buildings",
        type: "fill-extrusion",
        source: "buildings",
        paint: {
          "fill-extrusion-color": "#1c332c",
          "fill-extrusion-height": ["coalesce", ["get", "height"], 10],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.92,
          "fill-extrusion-vertical-gradient": true,
        },
      });

      map.addSource("roads", { type: "geojson", data: challenge.roads });
      map.addLayer({
        id: "roads-glow",
        type: "line",
        source: "roads",
        paint: {
          "line-color": "#4a5c52",
          "line-width": 16,
          "line-opacity": 0.9,
        },
      });
      map.addLayer({
        id: "roads-core",
        type: "line",
        source: "roads",
        paint: {
          "line-color": "#d7c4a3",
          "line-width": 7,
          "line-opacity": 1,
        },
      });
      map.addLayer({
        id: "road-names",
        type: "symbol",
        source: "roads",
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-size": 13,
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-keep-upright": true,
          visibility: "visible",
        },
        paint: {
          "text-color": "#d7fff0",
          "text-halo-color": "#04110c",
          "text-halo-width": 1,
        },
      });

      map.addSource("ghosts", { type: "geojson", data: emptyFc() });
      map.addLayer({
        id: "ghosts",
        type: "line",
        source: "ghosts",
        paint: {
          "line-color": "#6ea8ff",
          "line-width": 2.2,
          "line-opacity": 0.38,
          "line-dasharray": [1, 1.4],
        },
      });

      map.addSource("trail", { type: "geojson", data: emptyFc() });
      map.addLayer({
        id: "trail",
        type: "line",
        source: "trail",
        paint: {
          "line-color": "#ffb45a",
          "line-width": 3.4,
          "line-opacity": 0.9,
        },
      });

      map.addSource("look", {
        type: "geojson",
        data: lookFc(pos, heading),
      });
      map.addLayer({
        id: "look",
        type: "line",
        source: "look",
        paint: {
          "line-color": "#ffd89a",
          "line-width": 2,
          "line-opacity": 0.7,
        },
      });
      map.addSource("you", {
        type: "geojson",
        data: pointFc(pos, heading),
      });
      map.addLayer({
        id: "you-halo",
        type: "circle",
        source: "you",
        paint: {
          "circle-radius": 16,
          "circle-color": "#ffb45a",
          "circle-opacity": 0.18,
        },
      });
      map.addLayer({
        id: "you",
        type: "circle",
        source: "you",
        paint: {
          "circle-radius": 6,
          "circle-color": "#ffd89a",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#1a0f04",
        },
      });

      map.addSource("dest", {
        type: "geojson",
        data: pointSimple([challenge.dest.lon, challenge.dest.lat]),
      });
      map.addLayer({
        id: "dest",
        type: "circle",
        source: "dest",
        paint: {
          "circle-radius": 11,
          "circle-color": "#7ef0d0",
          "circle-opacity": 0.9,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#04241c",
        },
        layout: { visibility: "none" },
      });

      ready.current = true;
    });

    return () => {
      map.remove();
      mapRef.current = null;
      ready.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const you = map.getSource("you") as GeoJSONSource | undefined;
    you?.setData(pointFc(pos, heading));
    const look = map.getSource("look") as GeoJSONSource | undefined;
    look?.setData(lookFc(pos, heading));
    const trailSrc = map.getSource("trail") as GeoJSONSource | undefined;
    trailSrc?.setData(lineFc(trail));
    map.easeTo({
      center: pos,
      bearing: northUp ? 0 : heading,
      pitch: northUp ? 48 : 62,
      duration: 180,
      easing: (t) => t,
    });
  }, [pos, heading, trail, northUp]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const src = map.getSource("ghosts") as GeoJSONSource | undefined;
    src?.setData({
      type: "FeatureCollection",
      features: ghosts
        .filter((g) => g.path.length > 1)
        .map((g) => ({
          type: "Feature" as const,
          properties: { name: g.playerName },
          geometry: { type: "LineString" as const, coordinates: g.path },
        })),
    });
  }, [ghosts]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current || !map.getLayer("road-names")) return;
    map.setLayoutProperty("road-names", "visibility", "visible");
  }, [showLabels]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current || !map.getLayer("dest")) return;
    map.setLayoutProperty("dest", "visibility", showDest ? "visible" : "none");
  }, [showDest]);

  return <div ref={wrap} className="h-full w-full" />;
}

function emptyFc(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function pointFc(pos: LonLat, heading: number): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { heading },
        geometry: { type: "Point", coordinates: pos },
      },
    ],
  };
}

function lookFc(pos: LonLat, heading: number): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [pos, destinationPoint(pos, heading, 38)] },
      },
    ],
  };
}

function pointSimple(pos: LonLat): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: pos },
      },
    ],
  };
}

function lineFc(path: LonLat[]): GeoJSON.FeatureCollection {
  if (path.length < 2) return emptyFc();
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: path },
      },
    ],
  };
}
