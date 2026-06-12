export default function Loading() {
  return (
    <div className="min-h-screen pb-20 px-4 py-4">
      <div className="skeleton h-7 w-24 rounded mb-6" />
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-32 rounded-xl" />
          </div>
        ))}
        <div className="skeleton h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
