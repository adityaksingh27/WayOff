"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { destinationPoint, haversineM, nearestNamedStreet, pathLengthM, scoreRun, snapToRoads } from "@/lib/geo";
import type { Challenge, CopilotMessage, GhostRun, LonLat } from "@/lib/types";

const GameMap = dynamic(() => import("./GameMap"), { ssr: false });

type Keys = Record<string, boolean>;

export default function PlayClient({ challenge }: { challenge: Challenge }) {
  const spawn: LonLat = useMemo(
    () => [challenge.spawn.lon, challenge.spawn.lat],
    [challenge],
  );
  const dest: LonLat = useMemo(
    () => [challenge.dest.lon, challenge.dest.lat],
    [challenge],
  );
  const namedRoads = useMemo(
    () =>
      challenge.roads.features
        .filter((f) => f.properties.name)
        .map((f) => ({ name: f.properties.name, coordinates: f.geometry.coordinates })),
    [challenge],
  );
  const roadLines = useMemo(
    () => challenge.roads.features.map((f) => f.geometry.coordinates),
    [challenge],
  );

  const spawnStreet =
    nearestNamedStreet(spawn, namedRoads) || "an unnamed block";

  const [pos, setPos] = useState<LonLat>(spawn);
  const [heading, setHeading] = useState(0);
  const [trail, setTrail] = useState<LonLat[]>([spawn]);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [northUp, setNorthUp] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const [streetHint, setStreetHint] = useState(false);
  const [showLabels] = useState(true);
  const [ghosts, setGhosts] = useState<GhostRun[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [name, setName] = useState("local");
  const [chat, setChat] = useState<CopilotMessage[]>([
    {
      role: "assistant",
      text: `You're on ${spawnStreet} in ${challenge.place.name}. Find ${challenge.dest.name} — street names are on the ground. I will not tell you which street it's on.`,
    },
  ]);
  const [typed, setTyped] = useState("");
  const [listening, setListening] = useState(false);
  const [busyVoice, setBusyVoice] = useState(false);
  const [postcard, setPostcard] = useState<string | null>(null);
  const [film, setFilm] = useState<string | null>(null);
  const [imagineBusy, setImagineBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [voiceReady, setVoiceReady] = useState(false);

  const keys = useRef<Keys>({});
  const posRef = useRef(pos);
  const headingRef = useRef(heading);
  const trailRef = useRef(trail);
  const doneRef = useRef(false);
  const recRef = useRef<MediaRecorder | null>(null);

  posRef.current = pos;
  headingRef.current = heading;
  trailRef.current = trail;

  const nearDest = haversineM(pos, dest) < 70;
  const crow = haversineM(spawn, dest);
  const currentStreet = nearestNamedStreet(pos, namedRoads) || spawnStreet;

  useEffect(() => {
    const stored = localStorage.getItem("wayoff-name");
    if (stored) setName(stored);
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setVoiceReady(Boolean(d.ready)))
      .catch(() => setVoiceReady(false));
    void loadGhosts();
  }, [challenge.id, challenge.fingerprint]);

  async function loadGhosts() {
    try {
      const qs = new URLSearchParams({
        challengeId: challenge.id,
        fingerprint: challenge.fingerprint,
      });
      const res = await fetch(`/api/runs?${qs}`);
      const d = await res.json();
      setGhosts(d.runs ?? []);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      keys.current[e.key.toLowerCase()] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (!doneRef.current) {
        const k = keys.current;
        let h = headingRef.current;
        if (k["arrowleft"] || k["a"]) h -= 95 * dt;
        if (k["arrowright"] || k["d"]) h += 95 * dt;
        h = (h + 360) % 360;
        const forward = k["arrowup"] || k["w"] ? 1 : 0;
        const back = k["arrowdown"] || k["s"] ? -0.45 : 0;
        const input = forward + back;
        let here = posRef.current;
        if (input !== 0) {
          const next = destinationPoint(here, h, 22 * input * dt);
          here = snapToRoads(next, roadLines, 48);
          setPos(here);
          setTrail((tr) => {
            const prev = tr[tr.length - 1];
            if (!prev || haversineM(prev, here) > 7) return [...tr, here];
            return tr;
          });
        }
        setHeading(h);
        setNow(Date.now());
        if (haversineM(here, dest) < 55) {
          finish(false);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest, roadLines]);

  const finish = useCallback(
    (peekForce: boolean) => {
      if (doneRef.current) return;
      doneRef.current = true;
      setFinished(true);
      setShowBoard(true);
      const durationMs = Date.now() - startedAt;
      const distanceM = pathLengthM(trailRef.current);
      const s = scoreRun({
        durationMs,
        pathM: distanceM,
        crowM: crow,
        peekedLabels: peeked || streetHint || peekForce,
      });
      setScore(s);
      fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.id,
          fingerprint: challenge.fingerprint,
          playerName: name,
          path: trailRef.current,
          durationMs,
          distanceM,
          score: s,
          finished: true,
        }),
      })
        .then(() => loadGhosts())
        .catch(() => undefined);
    },
    [challenge.fingerprint, challenge.id, crow, name, peeked, startedAt, streetHint],
  );

  async function speak(text: string) {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId: "eve" }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play().catch(() => undefined);
  }

  async function askCopilot(playerSaid: string) {
    setBusyVoice(true);
    setError("");
    const history = [...chat, { role: "user" as const, text: playerSaid }];
    setChat(history);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          place: challenge.place.displayName,
          destName: challenge.dest.name,
          destKind: challenge.dest.kind,
          playerSaid,
          history: chat,
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Copilot failed");
      const text = data.text || "...";
      setChat([...history, { role: "assistant", text }]);
      if (voiceReady) await speak(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice failed");
    } finally {
      setBusyVoice(false);
    }
  }

  async function toggleListen() {
    if (listening && recRef.current) {
      recRef.current.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        setListening(false);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        const form = new FormData();
        form.append("file", blob, "take.webm");
        const res = await fetch("/api/stt", { method: "POST", body: form });
        const data = (await res.json()) as { text?: string; error?: string };
        if (data.text) await askCopilot(data.text);
        else setError(data.error || "Didn't catch that");
      };
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setError("Microphone blocked");
    }
  }

  async function makePostcard() {
    setImagineBusy("postcard");
    setError("");
    try {
      const res = await fetch("/api/imagine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "postcard",
          place: challenge.place.name,
          dest: challenge.dest.name,
          score,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Imagine failed");
      setPostcard(data.url || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Imagine failed");
    } finally {
      setImagineBusy(null);
    }
  }

  async function makeFilm() {
    setImagineBusy("film");
    setError("");
    try {
      const res = await fetch("/api/imagine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "video",
          place: challenge.place.name,
          dest: challenge.dest.name,
          imageUrl: postcard || undefined,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Film failed");
      setFilm(data.url || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Film failed");
    } finally {
      setImagineBusy(null);
    }
  }

  const elapsed = Math.floor((now - startedAt) / 1000);
  const walked = Math.round(pathLengthM(trail));

  return (
    <div className="relative h-dvh overflow-hidden bg-night text-sand">
      <GameMap
        challenge={challenge}
        pos={pos}
        heading={heading}
        trail={trail}
        ghosts={ghosts}
        northUp={northUp}
        showLabels={showLabels}
        showDest={nearDest || finished}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
        <div className="pointer-events-auto rounded-2xl border border-white/10 bg-night/78 px-4 py-3 backdrop-blur-md">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-mist">Find the building</p>
          <h1 className="font-serif text-2xl leading-tight">{challenge.dest.name}</h1>
          <p className="text-xs text-mist">
            {challenge.place.name} · street names are on the map. No pin until you arrive.
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-amber-200">
            You are on {currentStreet}
          </p>
          {streetHint && challenge.dest.streetName ? (
            <p className="mt-1 text-xs text-mist">Hint: it sits on {challenge.dest.streetName}</p>
          ) : null}
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="rounded-2xl border border-white/10 bg-night/78 px-4 py-3 text-right font-mono text-xs backdrop-blur-md">
            <div>{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}</div>
            <div className="text-mist">{walked} m walked</div>
            <div className="text-mist">
              {ghosts.length
                ? `${ghosts.length} ghost route${ghosts.length === 1 ? "" : "s"} on this hunt`
                : "First local here — share the drop link"}
            </div>
            <div className="text-mist">{nearDest ? "You can feel it." : "No pin. No compass to the target."}</div>
          </div>
          <div
            className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-night/70 font-mono text-[10px] uppercase tracking-widest text-mist"
            title="Your heading — not a GPS to the target"
          >
            <span style={{ transform: `rotate(${northUp ? 0 : -heading}deg)` }} className="block">
              N
            </span>
          </div>
          <button
            className="rounded-full border border-white/15 bg-night/70 px-3 py-1 text-[11px] uppercase tracking-widest"
            onClick={() => {
              void navigator.clipboard.writeText(window.location.href);
            }}
          >
            Copy drop link
          </button>
          <button
            className="rounded-full border border-white/15 bg-night/70 px-3 py-1 text-[11px] uppercase tracking-widest"
            onClick={() => setNorthUp((v) => !v)}
          >
            {northUp ? "North up" : "Heading up"}
          </button>
          <button
            className="rounded-full border border-amber-400/40 bg-night/70 px-3 py-1 text-[11px] uppercase tracking-widest text-amber-200"
            onClick={() => {
              if (!challenge.dest.streetName) return;
              setStreetHint(true);
              setPeeked(true);
            }}
          >
            {streetHint ? `On ${challenge.dest.streetName}` : "Hint: which street? (−score)"}
          </button>
        </div>
      </header>

      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-3 md:flex-row md:items-end">
        <div className="pointer-events-auto max-w-md rounded-2xl border border-white/10 bg-night/82 p-3 backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-mist">WAY · Grok Voice</p>
            <span className={`h-2 w-2 rounded-full ${voiceReady ? "bg-teal-300" : "bg-white/20"}`} />
          </div>
          <div className="mb-2 max-h-28 space-y-1 overflow-y-auto text-sm">
            {chat.slice(-4).map((m, i) => (
              <p key={i} className={m.role === "assistant" ? "text-sand" : "text-mist"}>
                <span className="font-mono text-[10px] uppercase tracking-widest">
                  {m.role === "assistant" ? "WAY" : "YOU"} ·{" "}
                </span>
                {m.text}
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && typed.trim()) {
                  void askCopilot(typed.trim());
                  setTyped("");
                }
              }}
              placeholder="Talk like a local…"
              className="flex-1 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={() => void toggleListen()}
              disabled={busyVoice}
              className={`rounded-full px-3 py-2 text-xs uppercase tracking-widest ${
                listening ? "bg-amber-400 text-night" : "border border-white/15"
              }`}
            >
              {listening ? "Stop" : "Hold talk"}
            </button>
          </div>
          {error ? <p className="mt-2 text-xs text-amber-200">{error}</p> : null}
        </div>

        <div className="pointer-events-auto ml-auto flex gap-2 md:hidden">
          <Pad label="L" onHold={() => (keys.current["a"] = true)} onRelease={() => (keys.current["a"] = false)} />
          <Pad label="Go" onHold={() => (keys.current["w"] = true)} onRelease={() => (keys.current["w"] = false)} />
          <Pad label="R" onHold={() => (keys.current["d"] = true)} onRelease={() => (keys.current["d"] = false)} />
        </div>

        <p className="pointer-events-none hidden text-right text-[11px] text-mist md:block">
          WASD / arrows · 3D walk · find the street {challenge.dest.name} is on
        </p>
      </div>

      {showBoard && score !== null ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-night p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-mist">You knew it, mostly</p>
            <h2 className="mt-1 font-serif text-4xl">Hometown IQ {score}</h2>
            <p className="mt-2 text-sm text-mist">
              {challenge.dest.name} in {challenge.place.name}. {Math.round(pathLengthM(trail))} m of your route vs{" "}
              {Math.round(crow)} m crow-flies. Blue ghosts are everyone else who hunted the same target.
            </p>
            {ghosts.length > 0 ? (
              <ol className="mt-4 space-y-1 font-mono text-xs text-mist">
                {ghosts
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 8)
                  .map((g, i) => (
                    <li key={g.id} className="flex justify-between gap-3">
                      <span>
                        {i + 1}. {g.playerName}
                      </span>
                      <span>
                        IQ {g.score} · {Math.round(g.distanceM)} m · {Math.round(g.durationMs / 1000)}s
                      </span>
                    </li>
                  ))}
              </ol>
            ) : null}
            <label className="mt-4 block text-xs text-mist">
              Name on the ghost trail
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  localStorage.setItem("wayoff-name", e.target.value);
                }}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sand"
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => void makePostcard()}
                className="rounded-full bg-amber-400 px-4 py-2 text-sm text-night"
              >
                {imagineBusy === "postcard" ? "Imagining…" : "Grok Imagine postcard"}
              </button>
              <button
                onClick={() => void makeFilm()}
                className="rounded-full border border-white/15 px-4 py-2 text-sm"
              >
                {imagineBusy === "film" ? "Filming…" : "Imagine recap film"}
              </button>
              <button
                onClick={() => setShowBoard(false)}
                className="rounded-full border border-white/15 px-4 py-2 text-sm"
              >
                See the ghosts
              </button>
              <a href="/" className="rounded-full border border-white/15 px-4 py-2 text-sm">
                New drop
              </a>
            </div>
            {postcard ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={postcard} alt="Imagine postcard" className="mt-4 w-full rounded-2xl" />
            ) : null}
            {film ? (
              <video src={film} controls className="mt-4 w-full rounded-2xl" />
            ) : null}
          </div>
        </div>
      ) : null}
      {finished && !showBoard ? (
        <button
          className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/15 bg-night/80 px-3 py-2 text-[11px] uppercase tracking-widest"
          onClick={() => setShowBoard(true)}
        >
          Score
        </button>
      ) : null}
    </div>
  );
}

function Pad({
  label,
  onHold,
  onRelease,
}: {
  label: string;
  onHold: () => void;
  onRelease: () => void;
}) {
  return (
    <button
      className="h-14 w-14 rounded-2xl border border-white/15 bg-night/80 text-sm"
      onPointerDown={(e) => {
        e.preventDefault();
        onHold();
      }}
      onPointerUp={onRelease}
      onPointerLeave={onRelease}
    >
      {label}
    </button>
  );
}
