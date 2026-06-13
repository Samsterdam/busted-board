export default function Loading() {
  return (
    <div className="min-h-screen pb-20 px-4 py-4 flex flex-col">
      <div className="skeleton h-7 w-52 rounded mb-4" />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="skeleton h-12 w-12 rounded-full mx-auto" />
          <div className="skeleton h-4 w-48 rounded mx-auto" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-4 w-56 rounded mx-auto" />
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4 pt-2 border-t border-border">
        <div className="skeleton h-9 flex-1 rounded-lg" />
        <div className="skeleton h-9 w-9 rounded-lg flex-shrink-0" />
      </div>
    </div>
  );
}
