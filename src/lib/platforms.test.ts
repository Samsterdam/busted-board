import { describe, it, expect } from "vitest";
import {
  PLATFORM_REGISTRY,
  PAID_PLATFORMS,
  FREE_PLATFORMS,
  getPlatformBySlug,
  getPlatformByTmdbId,
} from "./platforms";

describe("platform registry lookups", () => {
  it("finds a platform by slug", () => {
    expect(getPlatformBySlug("netflix")).toMatchObject({ name: "Netflix", tmdbId: 8 });
  });

  it("finds a platform by TMDB provider id", () => {
    expect(getPlatformByTmdbId(8)?.slug).toBe("netflix");
  });

  it("returns undefined for unknown slug / id", () => {
    expect(getPlatformBySlug("nope")).toBeUndefined();
    expect(getPlatformByTmdbId(-1)).toBeUndefined();
  });

  it("partitions the registry into paid and free without overlap", () => {
    expect(PAID_PLATFORMS.every((p) => p.type === "paid")).toBe(true);
    expect(FREE_PLATFORMS.every((p) => p.type === "free")).toBe(true);
    expect(PAID_PLATFORMS.length + FREE_PLATFORMS.length).toBe(PLATFORM_REGISTRY.length);
  });

  it("has unique slugs and tmdb ids", () => {
    const slugs = new Set(PLATFORM_REGISTRY.map((p) => p.slug));
    const ids = new Set(PLATFORM_REGISTRY.map((p) => p.tmdbId));
    expect(slugs.size).toBe(PLATFORM_REGISTRY.length);
    expect(ids.size).toBe(PLATFORM_REGISTRY.length);
  });
});
