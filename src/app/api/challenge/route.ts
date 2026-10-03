import { NextResponse } from "next/server";
import { createChallenge, createChallengeFromPlace, loadChallenge } from "@/lib/challenge";
import type { PlaceHit } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const challenge = await loadChallenge(id);
  if (!challenge) return NextResponse.json({ error: "Challenge expired" }, { status: 404 });
  return NextResponse.json({ challenge });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { query?: string; place?: PlaceHit; seed?: string };
    const challenge = body.place
      ? await createChallengeFromPlace(body.place, body.seed)
      : await createChallenge(body.query?.trim() || "", body.seed);
    return NextResponse.json({ challenge });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not drop you there" },
      { status: 400 },
    );
  }
}
