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
      {
        protocol: "https",
        hostname: "nmzksapyhjygwqxoopdt.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
