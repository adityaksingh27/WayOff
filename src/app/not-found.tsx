export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-night px-6 text-sand">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-mist">Drop expired</p>
      <h1 className="mt-3 font-serif text-4xl">That sidewalk is gone.</h1>
      <a href="/" className="mt-8 rounded-full bg-amber-400 px-5 py-2 text-sm text-night">
        New drop
      </a>
    </div>
  );
}
