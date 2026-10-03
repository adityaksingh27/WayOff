import { NextResponse } from "next/server";
import { hasXai } from "@/lib/xai";

export async function GET() {
  return NextResponse.json({ ready: hasXai() });
}
