import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { addRun, listRuns } from "@/lib/store";
import type { GhostRun, LonLat } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const challengeId = url.searchParams.get("challengeId") ?? undefined;
  const fingerprint = url.searchParams.get("fingerprint") ?? undefined;
  const runs = await listRuns({ challengeId, fingerprint });
  return NextResponse.json({ runs });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Omit<GhostRun, "id" | "createdAt"> & {
    path: LonLat[];
  };
  if (!body.challengeId || !body.path?.length) {
    return NextResponse.json({ error: "Invalid run" }, { status: 400 });
  }
  const run: GhostRun = {
    id: randomUUID(),
    challengeId: body.challengeId,
    fingerprint: body.fingerprint || body.challengeId,
    playerName: (body.playerName || "local").slice(0, 24),
    path: body.path.slice(0, 4000),
    durationMs: body.durationMs ?? 0,
    distanceM: body.distanceM ?? 0,
    score: body.score ?? 0,
    finished: Boolean(body.finished),
    createdAt: new Date().toISOString(),
  };
  await addRun(run);
  return NextResponse.json({ run });
}
