import { NextResponse } from "next/server";
import { grokStt, hasXai } from "@/lib/xai";

export async function POST(req: Request) {
  if (!hasXai()) {
    return NextResponse.json({ error: "Missing XAI_API_KEY" }, { status: 401 });
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No audio" }, { status: 400 });
  }
  try {
    const text = await grokStt(file);
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "STT failed" },
      { status: 502 },
    );
  }
}
