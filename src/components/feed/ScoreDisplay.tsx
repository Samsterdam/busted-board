"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StarRating } from "@/components/ratings/StarRating";

function getCinemaScoreColor(score: number | null): string {
  if (score == null) return "text-neutral-400";
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

export function CinemaScoreBadge({ score, tooltip }: { score: number | null; tooltip: string[] }) {
  const colorClass = getCinemaScoreColor(score);

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={`Cinema Score: ${score ?? "not rated"} out of 100`}
        className={`text-2xl font-bold tabular-nums cursor-help focus-visible:outline-2 focus-visible:outline-primary rounded ${colorClass}`}
      >
        {score ?? "—"}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs">
        {tooltip.length > 0 ? (
          <ul className="space-y-0.5">
            {tooltip.map((line, i) => (
              <li key={i} className="font-mono whitespace-pre">
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p>Score based on available data</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function ThreeScoreRow({
  criticsScore,
  audienceScore,
  voteCount,
  userRating,
  onRate,
  size = "sm",
}: {
  criticsScore: number | null;
  audienceScore: number | null;
  voteCount: number | null;
  userRating?: number;
  onRate?: () => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex items-center justify-between text-xs" role="group" aria-label="Scores">
      {/* Critics */}
      <Tooltip>
        <TooltipTrigger
          className="flex items-center gap-0.5 cursor-help text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary rounded"
          aria-label={`Critics score: ${criticsScore != null ? `${criticsScore}%` : "not available"}`}
        >
          🍅 {criticsScore != null ? `${criticsScore}%` : "—"}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Critics score from Rotten Tomatoes via OMDB
        </TooltipContent>
      </Tooltip>

      {/* Busted Board (user rating) */}
      {userRating ? (
        <Tooltip>
          <TooltipTrigger
            className="focus-visible:outline-2 focus-visible:outline-primary rounded"
            aria-label={`Your rating: ${userRating} out of 5 stars`}
          >
            <StarRating value={userRating} onChange={() => {}} readOnly size={size} />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Your Busted Board rating
          </TooltipContent>
        </Tooltip>
      ) : (
        <button
          type="button"
          onClick={onRate}
          className="text-muted-foreground hover:text-primary transition-colors underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-primary"
          aria-label="Rate this title"
        >
          rate
        </button>
      )}

      {/* Public */}
      <Tooltip>
        <TooltipTrigger
          className="flex items-center gap-0.5 cursor-help text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary rounded"
          aria-label={`Public score: ${audienceScore ?? "not available"} out of 10`}
        >
          ⭐ {audienceScore?.toFixed(1) ?? "—"}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Public score from TMDB
          {voteCount ? ` — ${voteCount.toLocaleString()} votes` : ""}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
