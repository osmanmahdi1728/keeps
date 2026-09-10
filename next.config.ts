import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  // Dev-only: phones and laptops reach the dev server by LAN IP, not localhost.
  allowedDevOrigins: ["192.168.2.29", "127.0.0.1", "localhost"],
};

export default nextConfig;
