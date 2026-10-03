import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Challenge, GhostRun } from "./types";

const file = path.join(process.cwd(), "data", "db.json");

type DB = {
  challenges: Challenge[];
  runs: GhostRun[];
};

const empty: DB = { challenges: [], runs: [] };

let queue: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readDb(): Promise<DB> {
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as DB;
    return {
      challenges: parsed.challenges ?? [],
      runs: parsed.runs ?? [],
    };
  } catch {
    return { challenges: [], runs: [] };
  }
}

async function writeDb(db: DB) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(db));
}

export async function addChallenge(c: Challenge) {
  await withLock(async () => {
    const db = await readDb();
    db.challenges.unshift(c);
    db.challenges = db.challenges.slice(0, 48);
    await writeDb(db);
  });
}

export async function getChallenge(id: string) {
  const db = await readDb();
  const c = db.challenges.find((row) => row.id === id);
  if (!c) return null;
  return { ...c, fingerprint: c.fingerprint || c.id, buildings: c.buildings ?? { type: "FeatureCollection", features: [] } };
}

export async function addRun(run: GhostRun) {
  await withLock(async () => {
    const db = await readDb();
    db.runs.unshift(run);
    db.runs = db.runs.slice(0, 400);
    await writeDb(db);
  });
  return run;
}

export async function listRuns(opts: { challengeId?: string; fingerprint?: string }) {
  const db = await readDb();
  return db.runs
    .filter((r) => {
      if (opts.fingerprint) return r.fingerprint === opts.fingerprint || r.challengeId === opts.challengeId;
      if (opts.challengeId) return r.challengeId === opts.challengeId;
      return false;
    })
    .slice(0, 24);
}

export async function getRun(id: string) {
  const db = await readDb();
  return db.runs.find((r) => r.id === id) ?? null;
}

export { empty as emptyDb };
