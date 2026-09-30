import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "dim-launched-semiconductor-followed.trycloudflare.com",
    "*.trycloudflare.com",
    "localhost:3000",
    "192.168.0.146:3000",
  ],
};

export default nextConfig;
