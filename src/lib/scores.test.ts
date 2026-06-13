import { describe, it, expect } from "vitest";
import { computeCinemaScore, computeRibbon } from "./scores";

// Characterization tests pinning the score/ribbon math so the magic-number ->
// named-constant extraction in config/scoring.ts can't silently change results.

describe("computeCinemaScore", () => {
  it("blends audience (0-10, scaled x10) and critics (0-100) at 50/50", () => {
    // audience 8 -> 80; critics 90; (80*0.5 + 90*0.5) = 85
    expect(computeCinemaScore(8, 90)).toBe(85);
  });

  it("uses audience alone when critics is missing (scaled to 0-100)", () => {
    expect(computeCinemaScore(7, null)).toBe(70);
  });

  it("uses critics alone when audience is missing", () => {
    expect(computeCinemaScore(null, 64)).toBe(64);
  });

  it("returns null when both are missing", () => {
    expect(computeCinemaScore(null, null)).toBeNull();
  });
});

describe("computeRibbon", () => {
  it("flags an Oscar winner regardless of other stats", () => {
    expect(computeRibbon(5, 5, 100, null, "Won 2 Oscars")).toBe("oscar");
  });

  it("flags trending above the popularity threshold (>100)", () => {
    expect(computeRibbon(5, 150, 100, null, null)).toBe("trending");
  });

  it("flags a hidden gem: high rating (>=7.5) but low popularity (<20)", () => {
    expect(computeRibbon(8, 10, 300, null, null)).toBe("gem");
  });

  it("flags a favorite above the vote-count threshold (>10,000)", () => {
    expect(computeRibbon(6, 50, 20_000, null, null)).toBe("favorite");
  });

  it("flags a recent release as new (within 6 months)", () => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    expect(computeRibbon(5, 10, 100, oneMonthAgo.toISOString(), null)).toBe("new");
  });

  it("returns null for an unremarkable older title", () => {
    expect(computeRibbon(5, 10, 100, "1990-01-01", null)).toBeNull();
  });
});
