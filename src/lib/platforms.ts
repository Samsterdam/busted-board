export type PlatformType = "paid" | "free";

export interface Platform {
  slug: string;
  name: string;
  tmdbId: number;
  type: PlatformType;
  logoUrl?: string;
}

// TMDB provider IDs — used to match watch/providers API results
// These serve as a fallback; the dynamic list comes from TMDB /watch/providers/movie?region=XX
export const PLATFORM_REGISTRY: Platform[] = [
  // Paid / subscription
  { slug: "netflix", name: "Netflix", tmdbId: 8, type: "paid" },
  { slug: "prime", name: "Prime Video", tmdbId: 119, type: "paid" },
  { slug: "disney", name: "Disney+", tmdbId: 337, type: "paid" },
  { slug: "hulu", name: "Hulu", tmdbId: 15, type: "paid" },
  { slug: "max", name: "Max", tmdbId: 1899, type: "paid" },
  { slug: "paramount", name: "Paramount+", tmdbId: 531, type: "paid" },
  { slug: "appletv", name: "Apple TV+", tmdbId: 350, type: "paid" },
  { slug: "peacock", name: "Peacock", tmdbId: 386, type: "paid" },
  { slug: "showtime", name: "Showtime", tmdbId: 37, type: "paid" },
  // Free / ad-supported
  { slug: "tubi", name: "Tubi", tmdbId: 257, type: "free" },
  { slug: "pluto", name: "Pluto TV", tmdbId: 300, type: "free" },
  { slug: "youtube", name: "YouTube (Free)", tmdbId: 192, type: "free" },
  { slug: "hoopla", name: "Hoopla", tmdbId: 212, type: "free" },
  { slug: "kanopy", name: "Kanopy", tmdbId: 191, type: "free" },
  { slug: "plex", name: "Plex", tmdbId: 538, type: "free" },
  { slug: "roku", name: "Roku Channel", tmdbId: 207, type: "free" },
  { slug: "crackle", name: "Crackle", tmdbId: 25, type: "free" },
];

export const PAID_PLATFORMS = PLATFORM_REGISTRY.filter((p) => p.type === "paid");
export const FREE_PLATFORMS = PLATFORM_REGISTRY.filter((p) => p.type === "free");

export function getPlatformBySlug(slug: string): Platform | undefined {
  return PLATFORM_REGISTRY.find((p) => p.slug === slug);
}

export function getPlatformByTmdbId(tmdbId: number): Platform | undefined {
  return PLATFORM_REGISTRY.find((p) => p.tmdbId === tmdbId);
}

// TMDB watch provider result types we consider "accessible" (not rent/buy)
export const ACCESSIBLE_PROVIDER_TYPES = ["flatrate", "free", "ads"] as const;
