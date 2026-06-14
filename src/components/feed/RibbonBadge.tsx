const RIBBON_CONFIG: Record<string, { label: string; className: string }> = {
  oscar: { label: "🏆 Oscar Winner", className: "bg-yellow-900/80 text-yellow-300" },
  trending: { label: "🔥 Trending", className: "bg-orange-900/80 text-orange-300" },
  gem: { label: "💎 Hidden Gem", className: "bg-teal-900/80 text-teal-300" },
  favorite: { label: "⭐ Fan Favorite", className: "bg-amber-900/80 text-amber-300" },
  new: { label: "🆕 New Release", className: "bg-blue-900/80 text-blue-300" },
  bingeable: { label: "📺 Bingeable", className: "bg-indigo-900/80 text-indigo-300" },
};

export function RibbonBadge({ ribbon }: { ribbon: string | null }) {
  if (!ribbon) return null;
  const config = RIBBON_CONFIG[ribbon];
  if (!config) return null;

  return (
    <span
      className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${config.className}`}
      role="img"
      aria-label={config.label}
    >
      {config.label}
    </span>
  );
}
