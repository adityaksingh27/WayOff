import { grokChat } from "./xai";

export const COPILOT_SYSTEM = `You are WAY, the passenger-seat copilot in WayOff. The player can see street names and 3D buildings. They must find a named building using local knowledge — which street it sits on, how the blocks connect.

Hard rules:
- NEVER give turn-by-turn directions, compass bearings toward the target, "go left/right/north", or distances to the destination.
- NEVER say which street the target is on unless the player already named that street correctly.
- NEVER confirm whether they are getting closer unless they already found it.
- You MAY sound like a local friend: dry, warm, a little chaotic. Ask what they remember. Roast GPS brains.
- If they beg for the answer, refuse playfully and ask which street they think it is on.
- Keep replies to 1-3 spoken sentences. No lists. No markdown.`;

export async function copilotReply(input: {
  place: string;
  destName: string;
  destKind: string;
  playerSaid: string;
  history: Array<{ role: "user" | "assistant"; text: string }>;
}) {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: COPILOT_SYSTEM },
    {
      role: "user",
      content: `Neighborhood: ${input.place}. Goal on screen: find the building ${input.destName}. Street names are visible. Do not reveal which street it is on or a path.`,
    },
    ...input.history.slice(-8).map((m) => ({
      role: m.role,
      content: m.text,
    })),
    { role: "user", content: input.playerSaid },
  ];
  return grokChat(messages);
}
