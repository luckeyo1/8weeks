import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

/** 공개 색인 대상은 랜딩(/) 뿐 (나머지는 noindex). */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${publicEnv.siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
