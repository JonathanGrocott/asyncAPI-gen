import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Full-stack build configuration (with server proxy)
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        // Replace static entry point with full entry point
        return html.replace(
          '/src/client/main.static.tsx',
          '/src/client/main.tsx'
        );
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
  },
});
