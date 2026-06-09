import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://54.82.162.215:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;