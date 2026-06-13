/**
 * IAB-standard ad creative sizes as `[width, height]` tuples. Dependency-free.
 *
 * Providers reference these instead of inlining raw dimensions, so a size used
 * by several placements (e.g. the 300×250 medium rectangle) is defined once.
 */

export type AdSize = [number, number];

export const MOBILE_BANNER: AdSize = [320, 50];
export const LEADERBOARD: AdSize = [728, 90];
export const MED_RECTANGLE: AdSize = [300, 250];
export const HALF_PAGE: AdSize = [300, 600];
