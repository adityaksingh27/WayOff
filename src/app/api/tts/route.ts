import { NextResponse } from "next/server";
import { grokTts, hasXai } from "@/lib/xai";

export async function POST(req: Request) {
  if (!hasXai()) {
    return NextResponse.json({ error: "Missing XAI_API_KEY" }, { status: 401 });
  }
  const { text, voiceId } = (await req.json()) as { text?: string; voiceId?: string };
  if (!text?.trim()) return NextResponse.json({ error: "No text" }, { status: 400 });
  try {
    const buf = await grokTts(text.slice(0, 500), voiceId || "eve");
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "TTS failed" },
      { status: 502 },
    );
  }
}
