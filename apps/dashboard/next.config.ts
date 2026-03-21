import type { NextConfig } from "next";

const nextConfig: any = {
  // Pass API_URL to server-side API routes
  serverRuntimeConfig: {
    API_URL: process.env.API_URL || "http://localhost:8080",
  },
  // These are accessible on both client and server
  publicRuntimeConfig: {
    APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
