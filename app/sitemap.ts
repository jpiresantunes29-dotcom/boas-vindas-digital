import type { MetadataRoute } from "next";
import { obterUrlSite } from "@/lib/seo/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: obterUrlSite(),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
