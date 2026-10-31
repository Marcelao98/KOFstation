import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// COOP/COEP: deixam o SharedArrayBuffer ligado sem flag do navegador (o Play! e o som por AudioWorklet precisam).
const isolamento = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' };

export default defineConfig({
  plugins: [react()],
  server: { headers: isolamento, strictPort: true, port: 5173 },
  preview: { headers: isolamento, strictPort: true, port: 4173 },
  build: { target: 'es2022' },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/testes/preparar.ts'],
  },
});
