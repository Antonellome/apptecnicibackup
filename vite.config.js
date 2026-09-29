// Triggering a server restart to clear a stubborn cache issue. (2)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'url';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,json,vue,txt,woff2}'],
                // AUMENTO IL LIMITE PER IL PRECACHING DEL SERVICE WORKER
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/europe-west6-riso-project-app\.cloudfunctions\.net\/.*/,
                        handler: 'NetworkOnly',
                        options: {
                            cacheName: 'api-cache',
                            backgroundSync: {
                                name: 'api-queue',
                                options: {
                                    maxRetentionTime: 24 * 60,
                                },
                            },
                        },
                    },
                ],
            },
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'logo png trasp.png'],
            manifest: {
                name: 'App Tecnici',
                short_name: 'Tecnici',
                description: 'Applicazione per la gestione dei rapportini di intervento.',
                theme_color: '#ffffff',
                display: 'standalone',
                orientation: 'any',
                icons: [
                    {
                        src: 'logo png trasp.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'logo png trasp.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: 'logo png trasp.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ],
    server: {
        hmr: {
            clientPort: 443
        }
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        },
    },
    optimizeDeps: {
        include: [],
    },
    // @ts-expect-error - L'oggetto `test` è aggiunto da Vitest e non fa parte della configurazione standard di Vite.
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: 'src/tests/setup.ts',
    },
});
