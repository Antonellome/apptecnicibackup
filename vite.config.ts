import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// CIAO. RICOMINCIO DA CAPO CON LA CONFIGURAZIONE DEI PERCORSI.
// USO IL METODO MODERNO E ROBUSTO CON 'URL' PER EVITARE OGNI AMBIGUITÀ.
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    fs: {
      strict: true,
    }
  },
  optimizeDeps: {
    include: ['@mui/material/Unstable_Grid2'],
  },
  plugins: [
    react(),
    // Il plugin tsconfigPaths ha fallito, lo rimuovo per evitare conflitti.
    // tsconfigPaths(), 
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'R.I.S.O. App Tecnici',
        short_name: 'R.I.S.O.',
        description: 'Report Individuali Sincronizzati Online',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  // QUESTA È LA SOLUZIONE DEFINITIVA PER L'ALIAS '@'.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
});
