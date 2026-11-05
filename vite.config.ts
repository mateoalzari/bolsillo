/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  preview: { port: 4173, strictPort: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
