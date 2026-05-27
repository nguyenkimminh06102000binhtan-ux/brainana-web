import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["chute-retrace-confidant.ngrok-free.dev"],
  experimental: {
    serverActions: {
      allowedOrigins: ["chute-retrace-confidant.ngrok-free.dev"],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
