// Cloudflare 로컬 개발에서만 getCloudflareContext(D1 등)를 초기화한다.
// production 빌드(next build / opennextjs-cloudflare build)에서는 실행하지 않아
// 빌드 중 miniflare 기동/파일락 문제를 피한다.
if (process.env.NODE_ENV === "development") {
  const { initOpenNextCloudflareForDev } = await import(
    "@opennextjs/cloudflare"
  );
  await initOpenNextCloudflareForDev();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Cloudflare Workers 런타임에서 이미지 최적화기 의존을 피하려 원본 서빙.
    // (아이콘/히어로는 사전 리사이즈 완료, 아바타는 소형)
    unoptimized: true,
  },
};

export default nextConfig;
