import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // ── CRÍTICO para Electron ─────────────────────────────────────────────────
  // Sin esto, index.html usa rutas absolutas (/assets/...) que no existen
  // cuando Electron carga el archivo desde el sistema de archivos local.
  base: './',

  build: {
    rollupOptions: {
      output: {
        // Nombre fijo sin hash → sin problemas de caché en producción
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      }
    }
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
