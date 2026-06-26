// Shown instantly on every navigation while the server component streams in.
// Keeps the shell responsive instead of blocking on a blank screen.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      {/* page header */}
      <div className="space-y-2">
        <div className="h-7 w-52 rounded-lg bg-sand" />
        <div className="h-4 w-72 rounded bg-sand/70" />
      </div>

      {/* stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-24 p-4">
            <div className="h-3 w-20 rounded bg-sand/70" />
            <div className="mt-3 h-6 w-16 rounded bg-sand" />
          </div>
        ))}
      </div>

      {/* content cards */}
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="h-4 w-32 rounded bg-sand" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-4 w-full rounded bg-sand/60" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
