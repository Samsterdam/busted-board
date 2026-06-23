import Image from "next/image";
import type { ComponentType, ReactNode } from "react";
import { posterSrc } from "@/lib/config/images";

interface IconButtonProps {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  onClick: () => void;
  /** Hover color: muted→foreground by default, or destructive for deletes. */
  destructive?: boolean;
}

/** Small square icon button used for row actions (edit, rate, delete). */
export function RowIconButton({ icon: Icon, label, onClick, destructive }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
        destructive ? "hover:text-destructive" : "hover:text-foreground"
      }`}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden={true} />
    </button>
  );
}

interface Props {
  title: string;
  posterPath: string | null;
  /** Secondary content rendered under the title (stars, date, notes…). */
  children?: ReactNode;
  /** Trailing action buttons (edit, rate, delete…). */
  actions?: ReactNode;
}

/** Shared poster + title + trailing-actions row used by every Watched-page list. */
export function MediaRow({ title, posterPath, children, actions }: Props) {
  const src = posterSrc(posterPath);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3" role="listitem">
      <div className="relative h-14 w-10 flex-shrink-0 rounded overflow-hidden bg-muted">
        {src ? (
          <Image src={src} alt={`Poster for ${title}`} fill className="object-cover" unoptimized />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        {children}
      </div>
      {actions ? <div className="flex gap-1">{actions}</div> : null}
    </div>
  );
}
