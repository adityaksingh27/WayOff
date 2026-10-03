import PlayClient from "@/components/PlayClient";
import { loadChallenge } from "@/lib/challenge";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = await loadChallenge(id);
  if (!challenge) notFound();
  return <PlayClient challenge={challenge} />;
}
