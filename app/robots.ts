import type { MetadataRoute } from "next";
import { obterUrlSite } from "@/lib/seo/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${obterUrlSite()}/sitemap.xml`,
  };
}
