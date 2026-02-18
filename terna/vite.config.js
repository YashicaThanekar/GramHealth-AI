import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'

// https://vite.dev/config/
import { resolve } from 'path'
export default defineConfig({
  plugins: [
    react(),
    // Generate .gz files for all assets > 1 KB
    compression({
      algorithm: 'gzip',
      threshold: 1024,
    }),
  ],
  build: {
    // ── Target modern browsers for smaller output ──────────────
    target: 'es2020',
    // ── Enable CSS code splitting ──────────────────────────────
    cssCodeSplit: true,
    // ── Minification ──────────────────────────────────────────
    minify: 'esbuild',
    // ── Manual chunk splitting to keep initial bundle small ────
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core → long-term cached vendor chunk
          if (id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/scheduler')) {
            return 'vendor-react'
          }
          // Firebase entire SDK → only downloaded on pages that need it
          if (id.includes('node_modules/firebase') ||
              id.includes('node_modules/@firebase')) {
            return 'vendor-firebase'
          }
        },
      },
    },
    // ── Chunk size warning threshold ──────────────────────────
    chunkSizeWarningLimit: 500,
  },
  server: {
    // Enable SPA fallback so all routes serve index.html
    historyApiFallback: true,
  },
  preview: {
    // Also enable fallback for vite preview
    historyApiFallback: true,
  },
})
