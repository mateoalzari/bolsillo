/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  preview: { port: 4174, strictPort: true },
  build: {
    // Recharts (con sus dependencias) pesa ~150 kB gzip; el código propio de la app, ~13 kB.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      // Recharts va en su propio archivo: la app se cachea por separado de la librería de gráficos.
      output: { manualChunks: { charts: ['recharts'] } },
    },
  },
  test: { globals: true, environment: 'node', include: ['src/**/*.test.ts'] },
});
