import type { NextConfig } from "next";

const devNgrokOrigins =
  process.env.NODE_ENV === "development"
    ? ["chute-retrace-confidant.ngrok-free.dev"]
    : [];

const nextConfig: NextConfig = {
  allowedDevOrigins: devNgrokOrigins,
  experimental: {
    serverActions: {
      allowedOrigins: devNgrokOrigins,
      bodySizeLimit: "10mb",
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
