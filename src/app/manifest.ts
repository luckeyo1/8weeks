import type { MetadataRoute } from "next";

/** PWA manifest (명세 41) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "기도 동행",
    short_name: "기도 동행",
    description: "한 번 나눈 기도제목을 다음 만남까지 함께 품어요.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#FAFAF8",
    theme_color: "#FAFAF8",
    lang: "ko",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
