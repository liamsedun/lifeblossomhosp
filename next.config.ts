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
};

export default nextConfig;
