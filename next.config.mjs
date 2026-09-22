import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Cloudflare 로컬 개발에서 getCloudflareContext 등을 쓸 수 있게 초기화.
// `next dev` 외에는 no-op 이라 Vercel/일반 빌드에 영향 없음.
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // Supabase Storage / Google profile images
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
