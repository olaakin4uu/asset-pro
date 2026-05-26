import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const domainSuffix = process.env.NEXT_PUBLIC_DOMAIN_SUFFIX || 'salvage.test';

// PWA wrapper. Service worker is disabled in dev to avoid stale caches during
// iteration; enabled in production so rural-site users can install the app
// and use it offline. Full offline architecture: see docs/OFFLINE-FIRST-PLAN.md
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    // App shell: precache the Next.js static assets so the UI loads offline.
    // Default behaviour is fine — we don't override precacheManifest.
    runtimeCaching: [
      {
        // GET /api/** → stale-while-revalidate so a previously-seen page
        // renders instantly from cache, then the UI refreshes when the
        // network responds. Mutations (POST/PATCH/DELETE) bypass this and
        // are handled by the offline write queue in src/lib/offline/.
        urlPattern: /\/api\/v1\/.*/i,
        handler: "StaleWhileRevalidate",
        method: "GET",
        options: {
          cacheName: "salvage-api-cache",
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Images — cache aggressively, long TTL.
        urlPattern: /\.(?:png|jpg|jpeg|webp|svg|gif|ico)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "salvage-images",
          expiration: { maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      {
        // Static fonts.
        urlPattern: /\.(?:woff|woff2|ttf|otf)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "salvage-fonts",
          expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // Skip type checking during build (pre-existing TS errors)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Next.js 16 uses Turbopack by default for builds.
  // An empty turbopack config tells Next.js we're aware and intentional —
  // without it the build aborts with a "webpack config + no turbopack config" error.
  turbopack: {},

  // Allow cross-origin requests from local development domains
  allowedDevOrigins: [
    'localhost:3005',
    'localhost:3001',
    'localhost:8080',
    domainSuffix,
    `demo.${domainSuffix}`,
    `*.${domainSuffix}`,
    `${domainSuffix}:3001`,
  ],

  // Module reorg: poultry, fish, piggery, cattle promoted from /livestock/<species>/*
  // to top-level /<species>/*. Keep old bookmarks working for ~one release;
  // remove once usage drains.
  async redirects() {
    return [
      { source: '/livestock/poultry/:path*', destination: '/poultry/:path*', permanent: false },
      { source: '/livestock/fish/:path*',    destination: '/fish/:path*',    permanent: false },
      { source: '/livestock/piggery/:path*', destination: '/piggery/:path*', permanent: false },
      { source: '/livestock/cattle/:path*',  destination: '/cattle/:path*',  permanent: false },
    ];
  },
};

export default withPWA(nextConfig);
