import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  allowedDevOrigins: ["192.168.2.29"],
};

export default nextConfig;
