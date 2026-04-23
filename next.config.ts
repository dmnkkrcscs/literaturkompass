import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // instrumentationHook is enabled by default in Next.js 15 — no config needed
serverExternalPackages: ["playwright", "bullmq", "prisma", "@prisma/client"],
  headers: async () => [
    {
      // Cache static assets aggressively
      source: '/:path*.(ico|png|jpg|jpeg|svg|webp|woff|woff2)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      // Cache Next.js static chunks
      source: '/_next/static/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      // Short cache for HTML pages — Cloudflare serves stale while revalidating
      source: '/((?!api/).*)',
      headers: [
        { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
      ],
    },
  ],
};

export default nextConfig;
