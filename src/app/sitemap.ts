import type { MetadataRoute } from "next";
import { PLATFORM_REGISTRY } from "@/lib/platforms";
import { APP_URL } from "@/lib/config/app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const platformPages: MetadataRoute.Sitemap = PLATFORM_REGISTRY.map((p) => ({
    url: `${APP_URL}/top/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: APP_URL,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${APP_URL}/browse`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...platformPages,
  ];
}
