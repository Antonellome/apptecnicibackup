import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';
// https://vitejs.dev/config/
export default defineConfig({
    // Force rebuild
    plugins: [react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        },
    },
    optimizeDeps: {
        include: ['trim-canvas'],
    },
});
