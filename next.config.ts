import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["msw", "@mswjs/interceptors"],
};

export default nextConfig;
