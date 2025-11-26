import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['images.unsplash.com', 'localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3-media*.fl.yelpcdn.com',
      },
      {
        protocol: 'https',
        hostname: '**.yelpcdn.com',
      },
    ],
  },
  // Disable experimental features that might cause issues
  experimental: {
    turbo: undefined,
  },
};

export default nextConfig;
