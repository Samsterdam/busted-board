export default function Loading() {
  return (
    <div className="min-h-screen pb-20 px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton h-7 w-24 rounded" />
        <div className="skeleton h-8 w-16 rounded-lg" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4 mb-4 border-b border-border pb-2">
        <div className="skeleton h-5 w-24 rounded" />
        <div className="skeleton h-5 w-28 rounded" />
      </div>

      {/* Search skeleton */}
      <div className="skeleton h-9 w-full rounded-lg mb-4" />

      {/* List skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-3">
            <div className="skeleton h-14 w-10 rounded flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3 w-2/3 rounded" />
              <div className="skeleton h-3 w-1/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
