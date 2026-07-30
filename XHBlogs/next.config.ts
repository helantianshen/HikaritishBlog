import type { NextConfig } from "next";

const apiProxyURL = (
  process.env.API_PROXY_URL ||
  process.env.API_INTERNAL_URL ||
  "http://127.0.0.1:8080"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd(),
  },
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyURL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
