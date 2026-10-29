import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Loaded by Node at runtime: bundling it pulls in a PowerShell helper
  // Turbopack cannot resolve.
  serverExternalPackages: ["@azure/identity"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
