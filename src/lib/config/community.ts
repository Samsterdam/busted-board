/** Community free-link submission constants. Dependency-free. */

export const DOMAIN_ALLOWLIST = [
  "youtube.com",
  "tubitv.com",
  "pluto.tv",
  "peacocktv.com",
  "crackle.com",
  "hoopladigital.com",
  "kanopy.com",
  "plex.tv",
  "therokuchannel.roku.com",
  "popcornflix.com",
  "shout-tv.com",
] as const;

export const MAX_LINKS_PER_MEDIA = 5;
export const MAX_LINKS_PER_USER_PER_MEDIA = 2;
export const MAX_SUBMISSIONS_PER_USER_PER_DAY = 10;
export const LINK_LABEL_MAX_LENGTH = 100;
export const LINK_URL_MAX_LENGTH = 500;
export const FLAG_AUTO_HIDE_THRESHOLD = 3;

/**
 * Validates a user-submitted URL: must be http/https and hostname must be on
 * the allowlist. Returns the normalized hostname on success, null on failure.
 */
export function validateCommunityUrl(raw: string): { hostname: string } | null {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    const hostname = parsed.hostname.toLowerCase();
    const allowed = DOMAIN_ALLOWLIST.some(
      (d) => hostname === d || hostname.endsWith("." + d)
    );
    return allowed ? { hostname } : null;
  } catch {
    return null;
  }
}
