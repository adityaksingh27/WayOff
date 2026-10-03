"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { QUICK_DROPS } from "@/lib/hometowns";
import type { PlaceHit } from "@/lib/types";

export default function HomeClient() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [picked, setPicked] = useState<PlaceHit | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setReady(Boolean(d.ready)))
      .catch(() => setReady(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 3) {
        setHits([]);
        return;
      }
      const res = await fetch(`/api/places?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setHits(data.places ?? []);
    }, 550);
    return () => clearTimeout(t);
  }, [q]);

  async function dropIn(place?: PlaceHit) {
    const chosen = place ?? picked;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chosen ? { place: chosen } : { query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Drop failed");
      if (name) localStorage.setItem("wayoff-name", name);
      router.push(`/play/${data.challenge.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Drop failed");
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-night text-sand">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-24 top-[-10%] h-[60vh] w-[60vh] rounded-full bg-teal-900/40 blur-3xl" />
        <div className="absolute right-[-10%] bottom-[-10%] h-[70vh] w-[70vh] rounded-full bg-amber-900/30 blur-3xl" />
      </div>
      <main className="relative mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-mist">WayOff · hometown IQ</p>
        <h1 className="mt-4 font-serif text-5xl leading-[0.95] sm:text-7xl">
          You know this place.
          <br />
          Prove it.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-mist">
          Name a neighborhood you have actually walked. We drop you on a random sidewalk, street names on, buildings
          in 3D. Find a real building from memory — figure out which street it sits on — then steal better routes from
          other locals.
        </p>

        <div className="mt-10 rounded-3xl border border-white/10 bg-black/30 p-5 backdrop-blur-md">
          <label className="text-xs uppercase tracking-[0.22em] text-mist">Place you know</label>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPicked(null);
            }}
            placeholder="e.g. Park Slope, Brooklyn"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-night px-4 py-3 text-lg outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_DROPS.map((d) => (
              <button
                key={d.query}
                type="button"
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-mist hover:border-amber-400/50 hover:text-sand"
                onClick={() => {
                  setPicked(null);
                  setQ(d.query);
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
          {hits.length > 0 && !picked ? (
            <ul className="mt-2 overflow-hidden rounded-2xl border border-white/10">
              {hits.map((h) => (
                <li key={h.osmId}>
                  <button
                    className="w-full px-4 py-3 text-left text-sm hover:bg-white/5"
                    onClick={() => {
                      setPicked(h);
                      setQ(h.displayName);
                      setHits([]);
                    }}
                  >
                    <span className="block text-sand">{h.name}</span>
                    <span className="block text-xs text-mist">{h.displayName}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <label className="mt-4 block text-xs uppercase tracking-[0.22em] text-mist">What people call you on the map</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="optional"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-night px-4 py-3 outline-none"
          />
          <button
            disabled={busy || q.trim().length < 2}
            onClick={() => void dropIn()}
            className="mt-5 w-full rounded-full bg-amber-400 py-3 text-sm font-medium uppercase tracking-[0.2em] text-night disabled:opacity-50"
          >
            {busy ? "Plotting a cruel sidewalk…" : "Drop me in"}
          </button>
          {err ? <p className="mt-3 text-sm text-amber-200">{err}</p> : null}
        </div>

        <dl className="mt-10 grid gap-6 text-sm text-mist sm:grid-cols-3">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-sand">Find the building</dt>
            <dd className="mt-1">Street names on, 3D blocks, no pin. You start on a named street and hunt the one the building sits on.</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-sand">Grok Voice</dt>
            <dd className="mt-1">WAY rides shotgun. Talk to it. It will not give directions. That is the point.</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-sand">Grok Imagine</dt>
            <dd className="mt-1">Finish a run and it paints a postcard — then a recap film — of the route you invented.</dd>
          </div>
        </dl>
        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-mist">
          {ready ? "xAI connected · Voice + Imagine live" : "Add XAI_API_KEY in .env.local for Voice + Imagine"}
        </p>
      </main>
    </div>
  );
}
