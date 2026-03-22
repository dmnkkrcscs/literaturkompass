import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ["playwright", "bullmq", "prisma", "@prisma/client"],
};

export default nextConfig;
