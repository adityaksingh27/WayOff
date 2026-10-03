# WayOff

A hometown knowledge game: name a place you actually know, get dropped on a random sidewalk with the street names stripped, and walk to a real street or building using only your head. After you finish, ghost routes from other people show how they got there.

Built in Cursor for a hackathon track that requires Cursor plus Grok Imagine or Voice. WayOff uses **both**, plus a Grok Bot planning brief.

## Play

```bash
npm install
cp .env.example .env.local
# paste an xAI key from https://console.x.ai
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The map works without a key: unlabeled OpenStreetMap streets on a dark canvas (Overpass). **Grok Voice** (WAY) and **Grok Imagine** (postcard + recap film) need `XAI_API_KEY` **and xAI credits** on that team — a key with $0 balance will talk back with a permission error.

## How it works

1. Search a neighborhood you have walked, or tap a quick drop.
2. We pull real streets and named places from OpenStreetMap.
3. You spawn on a random road. The target is a real street or building ~400–1600m away. No destination pin until you are on top of it.
4. Walk with WASD / arrows. You stick to the street grid. Heading-up camera. Peeking names costs Hometown IQ.
5. Blue dashed lines are other locals hunting the same target.
6. Talk to WAY with text or the mic — Grok Voice STT + TTS. It will not navigate for you.
7. At the end, Grok Imagine paints a postcard of the night walk, and can animate it into a short recap film.

## Stack

- Next.js + TypeScript + Tailwind
- MapLibre GL, CARTO dark unlabeled tiles
- Nominatim + Overpass
- xAI Grok Voice (STT, TTS, copilot chat)
- xAI Grok Imagine (image + video)

## Grok Bot

Paste [`GROK_BOT.md`](./GROK_BOT.md) into a Grok Bot group for planning and collaboration. Judges: see [`HACKATHON.md`](./HACKATHON.md).
