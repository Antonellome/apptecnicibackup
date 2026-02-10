import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  // Blocco server per forzare il riavvio completo.
  server: {
    host: '0.0.0.0',
    // Aggiungiamo un parametro per essere sicuri di invalidare la cache
    fs: {
      strict: true,
    }
  },
  optimizeDeps: {
    include: ['@mui/material/Unstable_Grid2'],
  },
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'R.I.S.O. App Tecnici',
        short_name: 'R.I.S.O.',
        description: 'Report Individuali Sincronizzati Online',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
});
