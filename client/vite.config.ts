import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig(({ mode: _mode }) => {
  // For the dev server proxy, we always target loopback (127.0.0.1:3001)
  // to avoid Windows Firewall blocks on inbound LAN IP traffic on port 3001.
  const apiBase = 'https://127.0.0.1:3001';
const wsBase = 'wss://127.0.0.1:3001';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      hmr: {
        port: 5174,
      },
      proxy: {
  '/graphql': { target: apiBase, changeOrigin: true, secure: false },
  '/auth':    { target: apiBase, changeOrigin: true, secure: false },
  '/admin':   { target: apiBase, changeOrigin: true, secure: false },
  '/health':  { target: apiBase, changeOrigin: true, secure: false },
  '/ws':      { target: wsBase, ws: true, changeOrigin: true, secure: false },
},
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
      coverage: {
        provider: 'v8' as const,
        reporter: ['text', 'html'],
        include: [
          'src/app/store/reducers.ts',
          'src/app/store/selectors.ts',
          'src/features/auth/authSchema.ts',
          'src/features/listings/listingSchema.ts',
        ],
        exclude: ['src/test/**'],
        thresholds: {
          lines: 85,
          functions: 85,
          branches: 80,
          statements: 85,
        },
      },
    },
  };
});
