import { PageShell } from "@/components/layout/PageShell";

export default function SurpriseLoading() {
  return (
    <PageShell className="px-4 py-4">
      <div className="flex items-center justify-between mb-6">
        <div className="skeleton h-8 w-36 rounded" />
        <div className="skeleton h-8 w-28 rounded" />
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-40 w-full rounded-2xl" />
        ))}
      </div>
    </PageShell>
  );
}
