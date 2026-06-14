import { QUIZ_SIZE } from "@/lib/config/quiz";

export default function Loading() {
  return (
    <div className="min-h-screen pb-20 px-4 py-4">
      <div className="skeleton h-7 w-40 rounded mb-1" />
      <div className="skeleton h-4 w-64 rounded mb-6" />
      <div className="space-y-3">
        {Array.from({ length: QUIZ_SIZE }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-3">
            <div className="skeleton h-[60px] w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3 w-2/3 rounded" />
              <div className="skeleton h-3 w-1/4 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="skeleton h-8 w-16 rounded-lg" />
              <div className="skeleton h-8 w-20 rounded-lg" />
              <div className="skeleton h-8 w-12 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
