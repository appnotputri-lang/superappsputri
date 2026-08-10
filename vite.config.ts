import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss(),
        VitePWA({
          registerType: 'prompt',
          includeAssets: ['favicon.ico', 'robots.txt'],
          manifest: {
            name: 'SuperApps Putri - Notaris',
            short_name: 'SuperApps Putri',
            description: 'Aplikasi manajemen dokumen kantor notaris',
            theme_color: '#0f172a',
            background_color: '#f8fafc',
            display: 'standalone',
            start_url: '/',
            scope: '/',
            lang: 'id',
            icons: [
              { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
              { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
              { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
            ]
          },
          workbox: {
            maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MB precache limit
            // JANGAN precache request ke Firestore/RTDB/Google Drive/esm.sh — itu bukan static asset
            navigateFallbackDenylist: [/^\/api\//],
            runtimeCaching: [
              {
                // Google Fonts (sudah dipakai di index.html)
                urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }
                }
              },
              {
                // endpoint API Cloudflare Pages Functions (functions/api/*) — SELALU network, jangan pernah disajikan dari cache
                urlPattern: /^\/api\/.*/,
                handler: 'NetworkOnly'
              }
            ]
          },
          devOptions: { enabled: false } // jangan aktifkan SW saat `npm run dev`, supaya tidak mengganggu hot-reload
        })
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        chunkSizeWarningLimit: 2000
      }
    };
});
