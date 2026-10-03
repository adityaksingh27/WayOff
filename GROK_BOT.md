# Grok Bot brief — WayOff

Paste this into a new Grok Bot group (2–6 bots). Suggested roster: **PM**, **Game designer**, **Engineer**, **Demo producer**.

## Outcome

Ship a playable hometown navigation game that judges can finish in two minutes, built in Cursor, using Grok Voice and Grok Imagine for real gameplay — not a landing-page sticker.

## Product

WayOff drops you on a random sidewalk in a place you claim to know. Street names are off. You walk to a real OSM street or building. Other players’ routes draw as ghosts. WAY (Grok Voice) rides shotgun and is forbidden from giving directions. After a finish, Grok Imagine makes a postcard and optional recap film.

## Constraints

- Must keep working if `XAI_API_KEY` is missing (map + drop + ghosts still play).
- Never leak turn-by-turn or a destination pin until the player is essentially there.
- Prefer OSM/MapLibre over paid Google Maps.
- Demo path has to survive Overpass being slow: loading copy, retries.

## Stages (one owner each)

1. PM — keep the 2-minute demo script honest (`HACKATHON.md`).
2. Game designer — scoring, peek penalty, ghost readability, copy.
3. Engineer — map loop, OSM challenge builder, Voice + Imagine routes.
4. Demo producer — hometown test drops, backup neighborhood if live OSM fails.

## Decision boundary

Bots may edit this repo, rewrite copy, and propose API wiring. Bots must stop and ask a human before spending a lot of Imagine video generations, changing the scoring in a way that hides the peek penalty, or adding a GPS path to the target.

## Channel log (this Cursor + Grok session)

- Product name: **WayOff**.
- Core loop: unlabeled OSM streets, memory-only hunt, ghost routes, WAY as a passenger who refuses GPS.
- Track: Cursor-built, Grok Voice *and* Imagine, Grok Bot brief in this file.
- Maps: MapLibre + CARTO nolabels + Nominatim/Overpass. No Google.
- Ghosts match `place + destination`, so two drops in the same hometown can still teach each other routes.

