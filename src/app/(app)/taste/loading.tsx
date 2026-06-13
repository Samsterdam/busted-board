export default function Loading() {
  return (
    <div className="min-h-screen pb-20 px-4 py-4">
      <div className="flex items-center justify-between mb-6">
        <div className="skeleton h-7 w-44 rounded" />
        <div className="skeleton h-8 w-24 rounded-lg" />
      </div>

      <div className="space-y-4">
        <div className="skeleton h-20 rounded-xl" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-28 rounded" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-6 w-20 rounded-full" />)}
          </div>
        </div>
        <div className="space-y-2">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="flex gap-2">
            {[1, 2].map((i) => <div key={i} className="skeleton h-6 w-24 rounded-full" />)}
          </div>
        </div>
        <div className="space-y-2">
          <div className="skeleton h-4 w-20 rounded" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-6 w-16 rounded-full" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
