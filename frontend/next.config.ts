import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://16.170.215.231/api/:path*',
      },
    ];
  },
};

export default nextConfig;