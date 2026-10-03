# Hackathon notes — WayOff

## Track requirements

| Requirement | Where it lives |
| --- | --- |
| Built with Cursor | Entire repo authored in Cursor (Agent + project rules + this planning thread) |
| Grok Imagine **or** Voice | **Both** |
| Bonus: Grok Bot for planning / collaboration | `GROK_BOT.md` — paste into a Grok Bot group |

### Grok Voice API

- Speech-to-text: `POST /api/stt` → `https://api.x.ai/v1/stt` (`grok-voice-transcribe-2.0`)
- Text-to-speech: `POST /api/tts` → `https://api.x.ai/v1/tts` (voice `eve`)
- Copilot: `POST /api/copilot` → Grok chat with a hard rule: never give turn-by-turn directions
- In-game: hold talk or type to WAY while you walk

### Grok Imagine API

- Postcard: `POST /api/imagine` `{ type: "postcard" }` → `grok-imagine-image-2.0`
- Recap film: `{ type: "video" }` → `grok-imagine-video-1.5` (image-to-video when a postcard exists)

## Demo script (2 minutes)

1. Home: “Park Slope, Brooklyn” (or the judge’s hometown). Drop me in.
2. Show unlabeled streets, heading-up camera, WASD. Point at the target name in the HUD — no pin on the map.
3. Speak: “I think if I find the park I can get there.” WAY answers out loud and refuses to navigate.
4. Peek names once, note the score penalty.
5. Reach the target. Open **See the ghosts** to compare routes. For a second ghost, copy the drop link (same spawn) *or* drop into the same hometown again (same named target still ghosts).
6. Generate Imagine postcard, then recap film.

## Why this wins the theme

Navigation games usually cheat with GPS. WayOff is the opposite: the map is real, the names are gone, and the only instrument is having lived there. Voice makes it feel like a passenger. Imagine makes the run a souvenir. Ghost routes turn a solo memory test into a local sport.
