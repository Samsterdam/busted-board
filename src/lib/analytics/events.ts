import posthog from "posthog-js";

export const trackSignupComplete      = (p: { platformCount: number }) => posthog.capture("signup_complete", p);
export const trackPlatformChanged     = (p: { platformCount: number }) => posthog.capture("platform_changed", p);
export const trackFeedViewed          = (p: { titleCount: number }) => posthog.capture("feed_viewed", p);
export const trackTitleOpened         = (p: { tmdbId: number; title: string; mediaType: "movie" | "tv" }) => posthog.capture("title_opened", p);
export const trackTitleRated          = (p: { tmdbId: number; title: string; mediaType: "movie" | "tv"; rating: number }) => posthog.capture("title_rated", p);
export const trackTitleWatchlisted    = (p: { tmdbId: number; title: string; mediaType: "movie" | "tv"; action: "add" | "remove" }) => posthog.capture("title_watchlisted", p);
export const trackFeedReshuffled      = () => posthog.capture("feed_reshuffled");
export const trackMoodFilterApplied   = (p: { mood: string }) => posthog.capture("mood_filter_applied", p);
export const trackImportCompleted     = (p: { source: "trakt" | "letterboxd"; ratingsImported: number; watchlistImported: number }) => posthog.capture("import_completed", p);
export const trackUpgradePromptViewed = () => posthog.capture("upgrade_prompt_viewed");
export const trackUpgradeCTAClicked   = (p: { billingCycle: "monthly" | "annual" }) => posthog.capture("upgrade_cta_clicked", p);
export const trackSignOut             = () => posthog.capture("sign_out");
