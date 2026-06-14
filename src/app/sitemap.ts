import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/config/app";
import { MOTN_SERVICE_IDS, WATCHMODE_SOURCE_IDS } from "@/lib/config/catalog";

const platformSlugs = [
  ...Object.keys(MOTN_SERVICE_IDS),
  ...Object.keys(WATCHMODE_SOURCE_IDS),
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const platformPages: MetadataRoute.Sitemap = platformSlugs.map((slug) => ({
    url: `${APP_URL}/top/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [
    {
      url: APP_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${APP_URL}/browse`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...platformPages,
  ];
}
