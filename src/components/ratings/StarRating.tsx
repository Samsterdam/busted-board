"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface Props {
  value: number;
  onChange: (rating: number) => void;
  size?: "sm" | "md";
  readOnly?: boolean;
}

export function StarRating({ value, onChange, size = "md", readOnly = false }: Props) {
  const [hovered, setHovered] = useState(0);
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const display = hovered || value;

  return (
    <div
      className="flex gap-0.5"
      role={readOnly ? "img" : "radiogroup"}
      aria-label={`Rating: ${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role={readOnly ? undefined : "radio"}
          aria-checked={readOnly ? undefined : value === star}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          disabled={readOnly}
          onClick={readOnly ? undefined : () => onChange(star)}
          onMouseEnter={readOnly ? undefined : () => setHovered(star)}
          onMouseLeave={readOnly ? undefined : () => setHovered(0)}
          className={`transition-colors ${readOnly ? "cursor-default" : "cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"}`}
        >
          <Star
            className={`${iconSize} transition-colors ${
              star <= display ? "fill-primary stroke-primary" : "fill-none stroke-muted-foreground"
            }`}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
}
