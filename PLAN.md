# WayOff — Grok Bot planning log

Session used for project planning and collaboration (Cursor + Grok).

## Goal

Win a Cursor-built hackathon track with a hometown navigation game that uses Grok Voice and Grok Imagine as real gameplay, not stickers.

## Decisions

1. Name: WayOff.
2. Fantasy: you claim you know a place; we drop you unlabeled; you walk streets from memory.
3. Maps: OSM/MapLibre, never a GPS route to the pin.
4. Social: ghost polylines for the same hunt (place + named target).
5. Voice: WAY, STT + chat + TTS, forbidden from navigating.
6. Imagine: finish postcard + optional recap film.
7. Demo: two-minute script in HACKATHON.md; quick drops on the home screen.

## Open for the human

- Put `XAI_API_KEY` in `.env.local`.
- Paste GROK_BOT.md into a Grok Bot group if the team is more than this thread.
- Demo on a dense neighborhood (Park Slope, Mission, Shoreditch) in case Overpass is slow.
