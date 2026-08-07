import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [],
  },
  // Prisma client is generated into src/generated
  serverExternalPackages: ["@prisma/client", "pg", "bcryptjs"],
};

export default nextConfig;
