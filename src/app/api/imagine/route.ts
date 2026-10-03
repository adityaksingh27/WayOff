import { NextResponse } from "next/server";
import { grokImagineImage, grokImagineVideo, hasXai } from "@/lib/xai";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: Request) {
  if (!hasXai()) {
    return NextResponse.json(
      { error: "Add XAI_API_KEY to unlock Grok Imagine recaps." },
      { status: 401 },
    );
  }
  const body = (await req.json()) as {
    type?: "postcard" | "video";
    place?: string;
    dest?: string;
    score?: number;
    imageUrl?: string;
  };
  const place = body.place || "a hometown";
  const dest = body.dest || "a street you used to know";
  try {
    if (body.type === "video") {
      const prompt = `Cinematic 8-second night walk through ${place} toward ${dest}. Amber pedestrian light moving along wet streets, teal shadows, analog grain, no readable text, no logos. Camera drifts above the rooftops then drops to street level.`;
      const url = await grokImagineVideo(prompt, body.imageUrl);
      return NextResponse.json({ url, kind: "video" });
    }
    const prompt = `Illustrated cinematic postcard of a night walk through ${place} toward ${dest}. A glowing amber trail winds through a dark unlabeled city grid. Mood: you almost got lost in a place you grew up in. Film still, analog grain, teal and amber, no readable street names, no logos, no watermarks.`;
    const url = await grokImagineImage(prompt, "16:9");
    return NextResponse.json({ url, kind: "image" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Imagine failed" },
      { status: 502 },
    );
  }
}
