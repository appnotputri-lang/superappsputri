import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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
      ],
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('firebase')) {
                  return 'vendor-firebase';
                }
                if (id.includes('docx') || id.includes('jspdf') || id.includes('html2canvas') || id.includes('purify')) {
                  return 'vendor-doc-helpers';
                }
                return 'vendor';
              }
              if (id.includes('.json')) {
                // Parse the directory / file name to name the chunk appropriately
                const name = path.basename(id, '.json');
                return `data-json-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
              }
            }
          }
        },
        chunkSizeWarningLimit: 1500
      }
    };
});
