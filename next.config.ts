import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },

  // ─── Netlify optimisations ──────────────────────────────────
  // Output handled by Netlify Next.js Runtime (no standalone needed)
  // trailingSlash: false,             // keep clean URLs
  // skipMiddlewareUrlNormalize: true, // faster middleware on Netlify

  // ─── Security headers (via netlify.toml) ─────────────────────
  // Configured at the CDN layer in netlify.toml, not here,
  // so they apply to all assets including static ones.
};

export default nextConfig;
