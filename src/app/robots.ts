import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

/**
 * 랜딩만 색인 허용, 나머지는 비색인 (명세 82~84).
 * 개별 페이지도 metadata robots noindex 를 지정하지만, 크롤러 차원에서도 차단.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/join/", "/prayers/", "/profile", "/home", "/my-prayers", "/login", "/signup"],
    },
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
  };
}
