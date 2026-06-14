import { RATING_MIN, RATING_MAX } from "@/lib/config/ratings";

const PCT_SCALE = 100;

interface Props {
  distribution: Record<number, number>;
}

const STAR_LEVELS = Array.from(
  { length: RATING_MAX - RATING_MIN + 1 },
  (_, i) => RATING_MAX - i
);

export function RatingDistribution({ distribution }: Props) {
  const maxCount = Math.max(...STAR_LEVELS.map((s) => distribution[s] ?? 0), 1);

  return (
    <div>
      <p className="text-sm font-medium mb-3">Rating Breakdown</p>
      <div className="space-y-1.5" role="list" aria-label="Star rating breakdown">
        {STAR_LEVELS.map((stars) => {
          const count = distribution[stars] ?? 0;
          const pct = Math.round((count / maxCount) * PCT_SCALE);
          return (
            <div
              key={stars}
              role="listitem"
              className="flex items-center gap-2"
              aria-label={`${stars} star: ${count} rating${count !== 1 ? "s" : ""}`}
            >
              <span className="w-16 shrink-0 text-xs text-primary font-medium">
                {"★".repeat(stars)}
              </span>
              <div
                className="flex-1 h-2 rounded-full bg-muted overflow-hidden"
                role="meter"
                aria-valuenow={count}
                aria-valuemin={0}
                aria-valuemax={maxCount}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-xs text-muted-foreground">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
