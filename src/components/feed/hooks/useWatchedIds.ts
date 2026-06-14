"use client";

import { useState, useEffect, type Dispatch, type SetStateAction } from "react";

export function useWatchedIds(): [Set<number>, Dispatch<SetStateAction<Set<number>>>] {
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/watched")
      .then((r) => r.json())
      .then((data: { watched?: { tmdbId: number }[] }) => {
        setWatchedIds(new Set((data.watched ?? []).map((w) => w.tmdbId)));
      })
      .catch(() => null);
  }, []);

  return [watchedIds, setWatchedIds];
}
