import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["msw", "@mswjs/interceptors"],
  distDir: process.env.NODE_ENV === "test" ? ".next-test" : ".next",
};

export default nextConfig;
