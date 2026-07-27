import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    proxy: {
      '/supabase-proxy': {
        target: 'https://sixcslagfkoujyvephmu.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase-proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Passa l'apikey header se presente
            if (req.headers['apikey']) {
              proxyReq.setHeader('apikey', req.headers['apikey']);
            }
            if (req.headers['apiKey']) {
              proxyReq.setHeader('apiKey', req.headers['apiKey']);
            }
          });
        },
      },
    },
  },
})
