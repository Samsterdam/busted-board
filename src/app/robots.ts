import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/config/app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/browse", "/top/"],
        disallow: ["/api/", "/login", "/onboarding", "/settings", "/watchlist", "/ratings"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
