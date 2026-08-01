import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── Pin workspace root ────────────────────────────────────
  // Prevents Next.js from picking up stale package-lock.json or
  // node_modules in parent directories (e.g. $HOME).
  turbopack: {
    root: process.cwd(),
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },

  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
