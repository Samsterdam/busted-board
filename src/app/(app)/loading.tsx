export default function Loading() {
  return (
    <div className="min-h-screen pb-20 px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="skeleton h-8 w-40 rounded" />
        <div className="flex gap-2">
          <div className="skeleton h-8 w-8 rounded-lg" />
          <div className="skeleton h-8 w-8 rounded-lg" />
          <div className="skeleton h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* Search bar */}
      <div className="skeleton h-10 w-full rounded-md mb-3" />

      {/* Platform chips */}
      <div className="flex gap-1.5 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-6 w-16 rounded-full" />
        ))}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden">
            <div className="skeleton aspect-[2/3] w-full" />
            <div className="p-2 space-y-2">
              <div className="skeleton h-3 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
