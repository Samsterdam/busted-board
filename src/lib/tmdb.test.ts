import { describe, it, expect } from "vitest";
import { posterUrl, logoUrl } from "./tmdb";

const IMAGE_BASE = "https://image.tmdb.org/t/p";

describe("posterUrl", () => {
  it("builds a sized URL from a path", () => {
    expect(posterUrl("/abc.jpg")).toBe(`${IMAGE_BASE}/w342/abc.jpg`);
    expect(posterUrl("/abc.jpg", "original")).toBe(`${IMAGE_BASE}/original/abc.jpg`);
  });

  it("returns null for missing paths", () => {
    expect(posterUrl(null)).toBeNull();
    expect(posterUrl(undefined)).toBeNull();
  });
});

describe("logoUrl", () => {
  it("builds a sized URL from a path, defaulting to w92", () => {
    expect(logoUrl("/x.png")).toBe(`${IMAGE_BASE}/w92/x.png`);
    expect(logoUrl("/x.png", "w45")).toBe(`${IMAGE_BASE}/w45/x.png`);
  });

  it("returns null for missing paths", () => {
    expect(logoUrl(null)).toBeNull();
    expect(logoUrl(undefined)).toBeNull();
  });
});
