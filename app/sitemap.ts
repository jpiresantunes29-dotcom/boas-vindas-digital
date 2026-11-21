import type { MetadataRoute } from "next";
import { obterUrlSite } from "@/lib/seo/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = obterUrlSite();
  return [
    {
      url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${url}/privacidade`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
