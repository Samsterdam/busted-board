import { PLATFORM_REGISTRY } from "@/lib/platforms";

// Platform homepage URLs — used as fallback when no affiliate link or deep link exists.
const PLATFORM_HOMEPAGES: Record<string, string> = {
  netflix: "https://www.netflix.com",
  prime: "https://www.amazon.com/prime-video",
  disney: "https://www.disneyplus.com",
  hulu: "https://www.hulu.com",
  max: "https://www.max.com",
  paramount: "https://www.paramountplus.com",
  appletv: "https://tv.apple.com",
  peacock: "https://www.peacocktv.com",
  tubi: "https://tubitv.com",
  pluto: "https://pluto.tv",
  youtube: "https://www.youtube.com/feed/storefront",
  hoopla: "https://www.hoopladigital.com",
  kanopy: "https://www.kanopy.com",
  plex: "https://www.plex.tv/watch-free-movies-shows/",
  roku: "https://therokuchannel.roku.com",
};

// Affiliate URL builders per platform slug.
// Amazon Associates: append tag param to drive tracked clicks on Prime Video.
// Other programs (Hulu, Disney+, etc.) can be added here after affiliate approval.
const AFFILIATE_BUILDERS: Record<string, (title: string) => string> = {
  prime: (title) =>
    `https://www.amazon.com/s?k=${encodeURIComponent(title)}&i=instant-video&tag=bustedboard-20`,
};

function getPlatformHomepage(slug: string): string {
  return PLATFORM_HOMEPAGES[slug] ?? "https://busted-board.vercel.app";
}

// Returns the best available URL for watching a title on a given platform.
// Priority: deepLink (from MOTN) > affiliate URL > platform homepage.
// platformName is the display name from item.platforms[] (e.g. "Prime Video").
export function getWatchUrl(platformName: string, title: string, deepLink?: string): string {
  if (deepLink) return deepLink;
  const platform = PLATFORM_REGISTRY.find((p) => p.name === platformName);
  if (!platform) return "#";
  const affiliateBuilder = AFFILIATE_BUILDERS[platform.slug];
  if (affiliateBuilder) return affiliateBuilder(title);
  return getPlatformHomepage(platform.slug);
}
