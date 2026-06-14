import Image from "next/image";
import type { PublicMediaItem } from "@/app/api/recommendations/public/browse/route";

interface Props {
  item: PublicMediaItem;
}

export function PublicMovieCard({ item }: Props) {
  const posterUrl = item.posterPath
    ? `https://image.tmdb.org/t/p/w342${item.posterPath}`
    : null;

  return (
    <article className="rounded-xl overflow-hidden border border-border bg-card group">
      <div className="relative aspect-[2/3] bg-muted">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={`${item.title} poster`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-muted-foreground text-center px-2">{item.title}</span>
          </div>
        )}
        {item.motnRating != null && (
          <div className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
            {item.motnRating}%
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium leading-tight line-clamp-2">{item.title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {item.releaseYear}
          {item.platforms.length > 0 && (
            <> · {item.platforms.slice(0, 2).join(", ")}{item.platforms.length > 2 ? ` +${item.platforms.length - 2}` : ""}</>
          )}
        </p>
      </div>
    </article>
  );
}
