export default function Loading() {
  return (
    <div className="min-h-screen pb-20 px-4 py-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton h-7 w-36 rounded" />
        <div className="flex gap-2">
          <div className="skeleton h-8 w-8 rounded-lg" />
          <div className="skeleton h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* Platform chips skeleton */}
      <div className="flex gap-2 mb-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-5 w-16 rounded-full" />
        ))}
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden border border-border">
            <div className="skeleton aspect-[2/3] w-full" />
            <div className="p-2 space-y-2">
              <div className="skeleton h-3 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
              <div className="skeleton h-6 w-8 rounded mx-auto" />
              <div className="skeleton h-3 w-full rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
