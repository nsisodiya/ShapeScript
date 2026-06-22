import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    strictPort: true,
    open: true,
    proxy: {
      // Forward AI API calls to the Express server during local dev.
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true
      }
    }
  },
  build: {
    target: 'esnext',
    sourcemap: true
  }
});
