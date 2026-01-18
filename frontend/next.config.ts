import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React compiler optimizations
  reactStrictMode: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Enable SWC minification (faster than Terser)
  swcMinify: true,
  
  // Optimize production builds
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Enable experimental features for better performance
  experimental: {
    // Optimize font loading
    optimizeFonts: true,
    // Optimize CSS
    optimizeCss: true,
  },
};

export default nextConfig;
