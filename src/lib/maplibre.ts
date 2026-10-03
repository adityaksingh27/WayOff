import * as maplibregl from "maplibre-gl";

let configured = false;

/** Next/Turbopack cannot load MapLibre's bundled worker; serve it from /public. */
export function configureMaplibre() {
  if (configured || typeof window === "undefined") return;
  configured = true;
  maplibregl.setWorkerUrl(`${window.location.origin}/maplibre/maplibre-gl-worker.mjs`);
}
