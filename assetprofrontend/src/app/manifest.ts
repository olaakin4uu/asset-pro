import type { MetadataRoute } from 'next';
import { brand } from '@/lib/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.appName,
    short_name: brand.appNameShort,
    description: 'Farm, inventory, sales, and accounting — works offline for rural sites.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    theme_color: '#1f3864',
    background_color: '#ffffff',
    icons: [
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    categories: ['business', 'productivity', 'agriculture'],
  };
}
