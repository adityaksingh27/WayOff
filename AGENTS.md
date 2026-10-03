# WayOff

Hometown knowledge navigation game. Next.js App Router, MapLibre, OpenStreetMap, Grok Voice, Grok Imagine.

- Do not add turn-by-turn routing or a destination marker until the player is within ~70m.
- Keep Voice copilot replies short and direction-free (`src/lib/copilot.ts`).
- Map tiles stay unlabeled by default; peeking names must cost score.
- Persist runs in `data/db.json` so ghost trails survive a refresh. Match ghosts by hunt fingerprint (place + destination), not only challenge id.
- Prefer OSM/Overpass/Nominatim. Do not introduce Google Maps unless asked.
