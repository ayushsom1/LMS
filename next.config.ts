import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Compress responses at the app level — saves ~70% on JSON API responses
  compress: true,

  // Tree-shake large icon/UI libraries to reduce bundle size
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-tabs",
      "@radix-ui/react-label",
      "@radix-ui/react-radio-group",
    ],
  },

  // Security and cache-control headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Prevent intermediary caching of API responses
        source: "/api/(.*)",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        // Immutable static assets — 1 year cache
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
