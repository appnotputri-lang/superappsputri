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
          strategies: 'injectManifest',
          srcDir: 'public',
          filename: 'sw.js',
          registerType: 'prompt',
          includeAssets: ['favicon.svg', 'favicon.png', 'apple-touch-icon.png', 'robots.txt'],
          manifest: {
            name: 'SuperApps Putri - Notaris',
            short_name: 'SuperApps Putri',
            description: 'Aplikasi manajemen dokumen kantor notaris',
            theme_color: '#1e61c3',
            background_color: '#1e61c3',
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
          injectManifest: {
            maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
            minify: false
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
