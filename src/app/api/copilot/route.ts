import { NextResponse } from "next/server";
import { copilotReply } from "@/lib/copilot";
import { hasXai } from "@/lib/xai";

export async function POST(req: Request) {
  if (!hasXai()) {
    return NextResponse.json({
      text: "I would talk, but you still need an xAI key. Until then: trust the grid, not the pin.",
      voice: false,
    });
  }
  const body = (await req.json()) as {
    place?: string;
    destName?: string;
    destKind?: string;
    playerSaid?: string;
    history?: Array<{ role: "user" | "assistant"; text: string }>;
  };
  if (!body.playerSaid?.trim()) {
    return NextResponse.json({ error: "Say something" }, { status: 400 });
  }
  try {
    const text = await copilotReply({
      place: body.place || "this town",
      destName: body.destName || "the place",
      destKind: body.destKind || "street",
      playerSaid: body.playerSaid,
      history: body.history || [],
    });
    return NextResponse.json({ text, voice: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Copilot failed" },
      { status: 502 },
    );
  }
}
