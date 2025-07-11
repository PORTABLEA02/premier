import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Configuration pour gérer le routing côté client
  server: {
    // En mode développement, rediriger toutes les routes vers index.html
    historyApiFallback: true,
  },
  // Configuration pour la production
  build: {
    rollupOptions: {
      // Assurer que les routes sont gérées correctement en production
      output: {
        manualChunks: undefined,
      },
    },
  },
});