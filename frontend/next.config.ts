import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  serverExternalPackages: [],

  experimental: {
    proxyTimeout: 300_000, // 5 minut
    optimizePackageImports: ['lucide-react', '@tiptap/react', '@tiptap/starter-kit'],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  async rewrites() {
    const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:8000";
    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },

  // Enable React compiler optimizations
  reactStrictMode: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [],
  },
  
  // Optimize production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
};

export default nextConfig;
