import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "geared-public.s3.amazonaws.com",
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;
